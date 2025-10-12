import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Book, Smartphone, Globe, Printer, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface FormattingWizardProps {
  manuscriptId: string;
  manuscriptTitle: string;
  wordCount: number;
  onClose?: () => void;
}

interface FormattingPreset {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  formats: string[];
  settings: {
    fontSize: number;
    lineSpacing: number;
    margins: { top: number; bottom: number; left: number; right: number };
    fontFamily: string;
    pageSize: string;
    includePageNumbers: boolean;
    chapterBreaks: boolean;
    headerFooter: boolean;
  };
}

const FORMATTING_PRESETS: FormattingPreset[] = [
  {
    id: "kdp-paperback",
    name: "Amazon KDP Paperback",
    description: "Industry-standard formatting for print books on Amazon KDP",
    icon: <Book className="h-5 w-5" />,
    formats: ["DOCX", "HTML"],
    settings: {
      fontSize: 11,
      lineSpacing: 1.15,
      margins: { top: 0.75, bottom: 0.75, left: 0.875, right: 0.625 },
      fontFamily: "Times New Roman",
      pageSize: "6x9",
      includePageNumbers: true,
      chapterBreaks: true,
      headerFooter: true
    }
  },
  {
    id: "kdp-ebook",
    name: "Amazon KDP eBook",
    description: "Optimized formatting for Kindle and digital readers",
    icon: <Smartphone className="h-5 w-5" />,
    formats: ["HTML", "Markdown"],
    settings: {
      fontSize: 12,
      lineSpacing: 1.5,
      margins: { top: 1, bottom: 1, left: 1, right: 1 },
      fontFamily: "Georgia",
      pageSize: "responsive",
      includePageNumbers: false,
      chapterBreaks: true,
      headerFooter: false
    }
  },
  {
    id: "traditional-manuscript",
    name: "Traditional Manuscript",
    description: "Standard submission format for agents and publishers",
    icon: <FileText className="h-5 w-5" />,
    formats: ["DOCX", "HTML"],
    settings: {
      fontSize: 12,
      lineSpacing: 2.0,
      margins: { top: 1, bottom: 1, left: 1, right: 1 },
      fontFamily: "Times New Roman",
      pageSize: "8.5x11",
      includePageNumbers: true,
      chapterBreaks: false,
      headerFooter: true
    }
  },
  {
    id: "web-publication",
    name: "Web Publication",
    description: "Clean formatting for online reading and blogs",
    icon: <Globe className="h-5 w-5" />,
    formats: ["HTML", "Markdown"],
    settings: {
      fontSize: 16,
      lineSpacing: 1.6,
      margins: { top: 2, bottom: 2, left: 2, right: 2 },
      fontFamily: "Georgia",
      pageSize: "responsive",
      includePageNumbers: false,
      chapterBreaks: true,
      headerFooter: false
    }
  },
  {
    id: "print-ready",
    name: "Professional Print",
    description: "High-quality formatting for professional printing",
    icon: <Printer className="h-5 w-5" />,
    formats: ["HTML"],
    settings: {
      fontSize: 10,
      lineSpacing: 1.2,
      margins: { top: 1, bottom: 1, left: 1.25, right: 1 },
      fontFamily: "Minion Pro",
      pageSize: "5.5x8.5",
      includePageNumbers: true,
      chapterBreaks: true,
      headerFooter: true
    }
  }
];

export function ManuscriptFormattingWizard({ 
  manuscriptId, 
  manuscriptTitle, 
  wordCount, 
  onClose 
}: FormattingWizardProps) {
  const [selectedPreset, setSelectedPreset] = useState<FormattingPreset | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string>("");
  const [customSettings, setCustomSettings] = useState<any>(null);
  const [isFormatting, setIsFormatting] = useState(false);
  const { toast } = useToast();

  const handlePresetSelect = (preset: FormattingPreset) => {
    setSelectedPreset(preset);
    setCustomSettings(preset.settings);
    setSelectedFormat(preset.formats[0]);
  };

  const handleFormatManuscript = async () => {
    if (!selectedPreset || !selectedFormat || !customSettings) {
      toast({
        title: "Missing Selection",
        description: "Please select a formatting preset and file format.",
        variant: "destructive",
      });
      return;
    }

    setIsFormatting(true);
    try {
      const response = await apiRequest(`/api/manuscripts/${manuscriptId}/format`, 'POST', {
        preset: selectedPreset.id,
        format: selectedFormat,
        settings: customSettings,
        options: {
          includeMetadata: true,
          optimizeForPrint: selectedFormat === 'PDF',
          includeTableOfContents: selectedPreset.settings.chapterBreaks
        }
      });

      if (response.downloadUrl) {
        // Trigger download
        const link = document.createElement('a');
        link.href = response.downloadUrl;
        link.download = `${manuscriptTitle}_${selectedPreset.id}.${selectedFormat.toLowerCase()}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: "Formatting Complete!",
          description: `Your manuscript has been formatted as ${selectedFormat} and is downloading.`,
        });
        onClose?.();
      }
    } catch (error) {
      toast({
        title: "Formatting Failed",
        description: "There was an error formatting your manuscript. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsFormatting(false);
    }
  };

  const estimatedPages = Math.ceil(wordCount / 250); // Rough estimate

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
          <Wand2 className="h-6 w-6" />
          Manuscript Formatting Wizard
        </h2>
        <p className="text-muted-foreground">
          Format "{manuscriptTitle}" for professional publishing
        </p>
        <div className="flex justify-center gap-4 mt-2 text-sm text-muted-foreground">
          <span>{wordCount.toLocaleString()} words</span>
          <span>~{estimatedPages} pages</span>
        </div>
      </div>

      <div className="grid gap-4">
        <Label className="text-base font-semibold">Choose Formatting Preset</Label>
        <div className="grid gap-3">
          {FORMATTING_PRESETS.map((preset) => (
            <Card 
              key={preset.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedPreset?.id === preset.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handlePresetSelect(preset)}
              data-testid={`preset-${preset.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  {preset.icon}
                  <div className="flex-1">
                    <CardTitle className="text-lg">{preset.name}</CardTitle>
                    <CardDescription>{preset.description}</CardDescription>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {preset.formats.map((format) => (
                      <Badge key={format} variant="secondary" className="text-xs">
                        {format}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {selectedPreset && (
        <>
          <Separator />
          
          <div className="space-y-4">
            <Label className="text-base font-semibold">File Format</Label>
            <Select value={selectedFormat} onValueChange={setSelectedFormat}>
              <SelectTrigger data-testid="format-select">
                <SelectValue placeholder="Select output format" />
              </SelectTrigger>
              <SelectContent>
                {selectedPreset.formats.map((format) => (
                  <SelectItem key={format} value={format}>
                    {format}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedFormat === 'HTML' && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>HTML Format:</strong> Downloads as a web page optimized for printing. 
                  Open the file in your browser and use "Print to PDF" to create a PDF document.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Label className="text-base font-semibold">Format Preview</Label>
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Font:</span> {customSettings?.fontFamily}
                  </div>
                  <div>
                    <span className="font-medium">Size:</span> {customSettings?.fontSize}pt
                  </div>
                  <div>
                    <span className="font-medium">Line Spacing:</span> {customSettings?.lineSpacing}x
                  </div>
                  <div>
                    <span className="font-medium">Page Size:</span> {customSettings?.pageSize}
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Margins:</span> 
                    {" "}Top: {customSettings?.margins.top}"
                    {", "}Bottom: {customSettings?.margins.bottom}"
                    {", "}Left: {customSettings?.margins.left}"
                    {", "}Right: {customSettings?.margins.right}"
                  </div>
                </div>
                
                <div className="flex gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={customSettings?.includePageNumbers} 
                      disabled 
                      className="scale-75"
                    />
                    <span>Page Numbers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={customSettings?.chapterBreaks} 
                      disabled 
                      className="scale-75"
                    />
                    <span>Chapter Breaks</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={customSettings?.headerFooter} 
                      disabled 
                      className="scale-75"
                    />
                    <span>Header/Footer</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onClose} data-testid="button-cancel">
          Cancel
        </Button>
        <Button 
          onClick={handleFormatManuscript}
          disabled={!selectedPreset || !selectedFormat || isFormatting}
          className="min-w-32"
          data-testid="button-format"
        >
          {isFormatting ? (
            "Formatting..."
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Format & Download
            </>
          )}
        </Button>
      </div>
    </div>
  );
}