import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { Download, FileText, Settings, Eye, CheckCircle } from "lucide-react";

interface ExportOptions {
  format: "docx" | "pdf" | "txt" | "markdown";
  fontSize: number;
  fontFamily: string;
  lineSpacing: number;
  marginSize: "narrow" | "normal" | "wide";
  pageSize: "letter" | "a4" | "legal" | "6x9";
  includePageNumbers: boolean;
  includeHeader: boolean;
  includeFooter: boolean;
  chapterPageBreaks: boolean;
  indentParagraphs: boolean;
  customTitle?: string;
  customAuthor?: string;
}

interface Manuscript {
  id: string;
  title: string;
  originalText: string;
  cleanedText: string;
  originalWordCount: number;
  cleanedWordCount: number;
}

const defaultOptions: ExportOptions = {
  format: "docx",
  fontSize: 12,
  fontFamily: "Aptos",
  lineSpacing: 1.5,
  marginSize: "normal",
  pageSize: "6x9",
  includePageNumbers: true,
  includeHeader: false,
  includeFooter: false,
  chapterPageBreaks: true,
  indentParagraphs: false,
};

const fontOptions = [
  "Aptos",
  "Times New Roman", 
  "Arial",
  "Calibri",
  "Georgia",
  "Garamond",
  "Book Antiqua"
];

const formatDescriptions = {
  docx: "Microsoft Word format - Perfect for further editing and publishing",
  pdf: "PDF format - Ready for printing and sharing",
  txt: "Plain text - Simple format for any device",
  markdown: "Markdown format - Great for web publishing and version control"
};

export function ManuscriptExportWizard() {
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [selectedManuscript, setSelectedManuscript] = useState<string>("");
  const [exportOptions, setExportOptions] = useState<ExportOptions>(defaultOptions);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingManuscripts, setIsLoadingManuscripts] = useState(false);

  const loadManuscripts = async () => {
    setIsLoadingManuscripts(true);
    try {
      const data = await apiRequest("/api/manuscripts", "GET");
      setManuscripts(data);
    } catch (err) {
      setError("Failed to load manuscripts");
    } finally {
      setIsLoadingManuscripts(false);
    }
  };

  const handleExport = async () => {
    if (!selectedManuscript) {
      setError("Please select a manuscript to export");
      return;
    }

    setIsExporting(true);
    setError(null);
    setExportSuccess(false);

    try {
      const response = await fetch("/api/manuscript/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          manuscriptId: selectedManuscript,
          options: exportOptions,
        }),
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `manuscript.${exportOptions.format}`;

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export manuscript");
    } finally {
      setIsExporting(false);
    }
  };

  const updateOption = <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => {
    setExportOptions(prev => ({ ...prev, [key]: value }));
  };

  const selectedManuscriptData = manuscripts.find(m => m.id === selectedManuscript);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            One-Click Manuscript Export
          </CardTitle>
          <CardDescription>
            Export your manuscripts with professional formatting options. Choose your preferred format and customize the styling to match your publishing needs.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Manuscript Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Manuscript</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={loadManuscripts}
              disabled={isLoadingManuscripts}
              variant="outline"
              className="w-full"
              data-testid="button-load-manuscripts"
            >
              {isLoadingManuscripts ? "Loading..." : "Load My Manuscripts"}
            </Button>

            {manuscripts.length > 0 && (
              <div>
                <Label>Choose Manuscript</Label>
                <Select value={selectedManuscript} onValueChange={setSelectedManuscript}>
                  <SelectTrigger data-testid="select-manuscript">
                    <SelectValue placeholder="Select a manuscript" />
                  </SelectTrigger>
                  <SelectContent>
                    {manuscripts.map((manuscript) => (
                      <SelectItem key={manuscript.id} value={manuscript.id}>
                        {manuscript.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedManuscriptData && (
              <div className="p-3 bg-muted rounded-md space-y-2">
                <h4 className="font-medium">{selectedManuscriptData.title}</h4>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <Badge variant="secondary">{(selectedManuscriptData.cleanedWordCount || selectedManuscriptData.originalWordCount).toLocaleString()} words</Badge>
                  <Badge variant="secondary">Manuscript</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Export Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Formatting Options
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="format" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="format">Format</TabsTrigger>
                <TabsTrigger value="styling">Styling</TabsTrigger>
              </TabsList>

              <TabsContent value="format" className="space-y-4">
                <div>
                  <Label>Export Format</Label>
                  <Select value={exportOptions.format} onValueChange={(value: any) => updateOption('format', value)}>
                    <SelectTrigger data-testid="select-export-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="docx">DOCX (Word)</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="txt">Plain Text</SelectItem>
                      <SelectItem value="markdown">Markdown</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDescriptions[exportOptions.format]}
                  </p>
                </div>

                <div>
                  <Label>Page Size</Label>
                  <Select value={exportOptions.pageSize} onValueChange={(value: any) => updateOption('pageSize', value)}>
                    <SelectTrigger data-testid="select-page-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="letter">Letter (8.5" × 11")</SelectItem>
                      <SelectItem value="a4">A4 (210mm × 297mm)</SelectItem>
                      <SelectItem value="legal">Legal (8.5" × 14")</SelectItem>
                      <SelectItem value="6x9">CreateSpace 6" × 9"</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Margin Size</Label>
                  <Select value={exportOptions.marginSize} onValueChange={(value: any) => updateOption('marginSize', value)}>
                    <SelectTrigger data-testid="select-margin-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="narrow">Narrow (0.5")</SelectItem>
                      <SelectItem value="normal">Normal (1")</SelectItem>
                      <SelectItem value="wide">Wide (1.25")</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="styling" className="space-y-4">
                <div>
                  <Label>Font Family</Label>
                  <Select value={exportOptions.fontFamily} onValueChange={(value) => updateOption('fontFamily', value)}>
                    <SelectTrigger data-testid="select-font-family">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fontOptions.map((font) => (
                        <SelectItem key={font} value={font}>{font}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Font Size</Label>
                  <Select value={exportOptions.fontSize.toString()} onValueChange={(value) => updateOption('fontSize', parseInt(value))}>
                    <SelectTrigger data-testid="select-font-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10pt</SelectItem>
                      <SelectItem value="11">11pt</SelectItem>
                      <SelectItem value="12">12pt</SelectItem>
                      <SelectItem value="13">13pt</SelectItem>
                      <SelectItem value="14">14pt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Line Spacing</Label>
                  <Select value={exportOptions.lineSpacing.toString()} onValueChange={(value) => updateOption('lineSpacing', parseFloat(value))}>
                    <SelectTrigger data-testid="select-line-spacing">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Single</SelectItem>
                      <SelectItem value="1.15">1.15</SelectItem>
                      <SelectItem value="1.5">1.5</SelectItem>
                      <SelectItem value="2">Double</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="page-numbers">Include Page Numbers</Label>
                    <Switch
                      id="page-numbers"
                      checked={exportOptions.includePageNumbers}
                      onCheckedChange={(checked) => updateOption('includePageNumbers', checked)}
                      data-testid="switch-page-numbers"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="chapter-breaks">Chapter Page Breaks</Label>
                    <Switch
                      id="chapter-breaks"
                      checked={exportOptions.chapterPageBreaks}
                      onCheckedChange={(checked) => updateOption('chapterPageBreaks', checked)}
                      data-testid="switch-chapter-breaks"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="indent-paragraphs">Indent Paragraphs</Label>
                    <Switch
                      id="indent-paragraphs"
                      checked={exportOptions.indentParagraphs}
                      onCheckedChange={(checked) => updateOption('indentParagraphs', checked)}
                      data-testid="switch-indent-paragraphs"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Preview & Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview & Export
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedManuscriptData && (
              <div className="p-4 border rounded-md space-y-3">
                <div className="text-sm text-muted-foreground">Preview</div>
                <div className="space-y-1">
                  <div className="font-medium">{selectedManuscriptData.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {exportOptions.fontFamily}, {exportOptions.fontSize}pt
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {exportOptions.lineSpacing}x line spacing
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {exportOptions.pageSize.toUpperCase()} • {exportOptions.marginSize} margins
                  </div>
                </div>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {exportSuccess && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Manuscript exported successfully! Check your downloads folder.
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleExport}
              disabled={!selectedManuscript || isExporting}
              className="w-full"
              size="lg"
              data-testid="button-export-manuscript"
            >
              {isExporting ? (
                "Exporting..."
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export Manuscript
                </>
              )}
            </Button>

            <div className="text-xs text-muted-foreground text-center">
              Export will download a {exportOptions.format.toUpperCase()} file to your device
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}