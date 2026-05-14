import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Calculator, Trash2 } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onCalculate: () => void;
}

export function PunchInput({ value, onChange, onCalculate }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>("");

  const handleFile = async (file: File) => {
    const text = await file.text();
    onChange(text);
    setFileName(file.name);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Punch Data</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste punches here, e.g.&#10;01.04.2026   09:57:18   3151   STD&#10;01.04.2026   18:10:32   3151   STD"
          className="min-h-[200px] font-mono text-sm"
        />
        <div className="flex flex-wrap gap-2 items-center">
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.csv,text/plain"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Upload .txt
          </Button>
          <Button onClick={onCalculate}>
            <Calculator className="mr-2 h-4 w-4" /> Calculate
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              onChange("");
              setFileName("");
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Clear
          </Button>
          {fileName && <span className="text-sm text-muted-foreground">Loaded: {fileName}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
