import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Download, FileText, BookOpen, Eye, Settings, CheckCircle } from "lucide-react";
import type { Novel } from "@shared/schema";

interface ManuscriptExportProps {
  novel: Novel;
}

export default function ManuscriptExport({ novel }: ManuscriptExportProps) {
  const [exportFormat, setExportFormat] = useState("docx");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      // Simulate export progress
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch(`/api/novels/${novel.id}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: exportFormat })
      });

      if (!response.ok) throw new Error('Export failed');

      clearInterval(progressInterval);
      setExportProgress(100);

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${novel.title}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setTimeout(() => {
        setExportProgress(0);
        setIsExporting(false);
      }, 1500);
    } catch (error) {
      console.error('Export error:', error);
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const formatOptions = [
    { value: "docx", label: "Microsoft Word (.docx)", icon: FileText, description: "KDP-ready format" },
    { value: "pdf", label: "PDF Document (.pdf)", icon: FileText, description: "Print-ready format" },
    { value: "markdown", label: "Markdown (.md)", icon: BookOpen, description: "Plain text format" },
    { value: "txt", label: "Plain Text (.txt)", icon: FileText, description: "Simple text file" }
  ];

  const selectedFormat = formatOptions.find(f => f.value === exportFormat);

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <Download className="h-5 w-5 text-green-600" />
          <div>
            <CardTitle className="text-green-900">Export Manuscript</CardTitle>
            <p className="text-sm text-green-700">Download your completed novel in multiple formats</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Manuscript Statistics */}
        <div className="bg-white border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-3">Manuscript Overview</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-green-700">Word Count:</span>
              <div className="font-medium text-green-900">{novel.targetWordCount?.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-green-700">Chapters:</span>
              <div className="font-medium text-green-900">{novel.targetChapterCount}</div>
            </div>
            <div>
              <span className="text-green-700">Pages (Est.):</span>
              <div className="font-medium text-green-900">{Math.round((novel.targetWordCount || 0) / 250)}</div>
            </div>
            <div>
              <span className="text-green-700">Status:</span>
              <div className="font-medium text-green-900">
                <Badge variant="secondary" className="bg-green-200 text-green-800">
                  {novel.status === 'completed' ? 'Complete' : 'In Progress'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Format Selection */}
        <div className="space-y-3">
          <h4 className="font-medium text-green-900">Export Format</h4>
          <Select value={exportFormat} onValueChange={setExportFormat}>
            <SelectTrigger data-testid="select-export-format">
              <SelectValue placeholder="Choose export format" />
            </SelectTrigger>
            <SelectContent>
              {formatOptions.map((format) => (
                <SelectItem key={format.value} value={format.value}>
                  <div className="flex items-center space-x-2">
                    <format.icon className="h-4 w-4" />
                    <div>
                      <div className="font-medium">{format.label}</div>
                      <div className="text-xs text-slate-500">{format.description}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Format Information */}
        {selectedFormat && (
          <div className="bg-white border border-green-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <selectedFormat.icon className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-900">{selectedFormat.label}</h4>
                <p className="text-sm text-green-700 mt-1">{selectedFormat.description}</p>
                {exportFormat === 'docx' && (
                  <div className="mt-2 text-xs text-green-600">
                    <CheckCircle className="h-3 w-3 inline mr-1" />
                    Includes proper formatting for Amazon KDP upload
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Export Progress */}
        {isExporting && (
          <div className="bg-white border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-2">
              <Settings className="h-4 w-4 text-green-600 animate-spin" />
              <span className="text-sm font-medium text-green-900">Preparing Export...</span>
              <span className="text-sm text-green-700">{exportProgress}%</span>
            </div>
            <div className="w-full bg-green-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-green-200">
          <Button
            variant="outline"
            className="border-green-300 text-green-700 hover:bg-green-100"
            data-testid="button-preview-manuscript"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          
          <Button
            onClick={handleExport}
            disabled={isExporting || novel.status !== 'completed'}
            className="bg-green-600 hover:bg-green-700 text-white"
            data-testid="button-export-manuscript"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : `Export as ${exportFormat.toUpperCase()}`}
          </Button>
        </div>

        {/* KDP Instructions */}
        {exportFormat === 'docx' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Amazon KDP Upload Instructions</h4>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Log into your Amazon KDP account</li>
              <li>Click "Create a New Title" and select "Paperback" or "Hardcover"</li>
              <li>Upload the exported DOCX file in the "Manuscript" section</li>
              <li>Review the automated formatting and make adjustments if needed</li>
              <li>Complete cover design and book details</li>
              <li>Submit for review and publishing</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}