import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, BookOpen, Monitor } from "lucide-react";

interface NovelDownloadOptionsProps {
  onDownload: (format: 'md' | 'docx', preset?: 'kdp' | 'manuscript' | 'ebook' | 'createspace') => void;
  isDownloading?: boolean;
}

export function NovelDownloadOptions({ onDownload, isDownloading = false }: NovelDownloadOptionsProps) {
  const [selectedFormat, setSelectedFormat] = useState<'md' | 'docx'>('docx');
  const [selectedPreset, setSelectedPreset] = useState<'kdp' | 'manuscript' | 'ebook' | 'createspace'>('kdp');

  const handleDownload = () => {
    if (selectedFormat === 'docx') {
      onDownload(selectedFormat, selectedPreset);
    } else {
      onDownload(selectedFormat);
    }
  };

  const presetDescriptions = {
    kdp: {
      title: "Amazon KDP Ready",
      description: "Optimized for Amazon Kindle Direct Publishing",
      details: ["Single spacing", "Times New Roman 12pt", "1\" margins", "Clean formatting"]
    },
    manuscript: {
      title: "Manuscript Submission",
      description: "Standard format for publishers and agents",
      details: ["Double spacing", "Times New Roman 12pt", "1\" margins", "Professional layout"]
    },
    ebook: {
      title: "E-book Format",
      description: "Optimized for digital reading",
      details: ["Single spacing", "Arial 11pt", "Smaller margins", "Compact layout"]
    },
    createspace: {
      title: "CreateSpace Formatted Template - 6 x 9",
      description: "Professional print-on-demand format for book publishing",
      details: ["1.1 spacing", "Aptos 10pt", "6×9 page size", "Binding-optimized margins", "Placeholders for missing content"]
    }
  };

  return (
    <Card className="w-full max-w-2xl" data-testid="novel-download-options">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Download Your Novel
        </CardTitle>
        <CardDescription>
          Choose your preferred format and styling options
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">File Format</label>
            <Select value={selectedFormat} onValueChange={(value: 'md' | 'docx') => setSelectedFormat(value)}>
              <SelectTrigger data-testid="select-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="docx">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>DOCX (Microsoft Word)</span>
                    <Badge variant="default">Recommended</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="md">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    <span>Markdown (Plain Text)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedFormat === 'docx' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Document Preset</label>
              <Select 
                value={selectedPreset} 
                onValueChange={(value: 'kdp' | 'manuscript' | 'ebook' | 'createspace') => setSelectedPreset(value)}
              >
                <SelectTrigger data-testid="select-preset">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(presetDescriptions).map(([key, preset]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{preset.title}</div>
                          <div className="text-xs text-muted-foreground">{preset.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedFormat === 'docx' && (
                <div className="mt-3 p-3 bg-muted rounded-lg">
                  <h4 className="text-sm font-medium mb-2">{presetDescriptions[selectedPreset].title}</h4>
                  <p className="text-xs text-muted-foreground mb-2">{presetDescriptions[selectedPreset].description}</p>
                  <ul className="text-xs space-y-1">
                    {presetDescriptions[selectedPreset].details.map((detail, index) => (
                      <li key={index} className="flex items-center gap-1">
                        <span className="w-1 h-1 bg-current rounded-full"></span>
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            onClick={handleDownload}
            disabled={isDownloading}
            size="lg"
            data-testid="button-download-novel"
          >
            <Download className="h-4 w-4 mr-2" />
            {isDownloading ? "Preparing Download..." : `Download ${selectedFormat.toUpperCase()}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}