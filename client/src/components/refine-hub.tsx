import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, CheckCircle, BookOpen, Eye, FileText } from "lucide-react";
import ManuscriptUploader from "./manuscript-uploader";
import { ManuscriptQualityAnalyzer } from "./manuscript-quality-analyzer";
import { ReadabilityAnalyzer } from "./readability-analyzer";
import { ProofreadingAnalyzer } from "./proofreading-analyzer";
import ConsistencyChecker from "./consistency-checker";
import GrammarChecker from "./grammar-checker";
import StyleConsistencyChecker from "./style-consistency-checker";
import type { Novel } from "@shared/schema";

interface RefineHubProps {
  novel?: Novel;
}

export default function RefineHub({ novel }: RefineHubProps) {
  const [activeAnalysis, setActiveAnalysis] = useState<string>("quality");

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-slate-900">Refine Your Manuscript</h2>
        <p className="text-slate-600 max-w-2xl mx-auto">
          Upload, analyze, and improve your manuscripts with comprehensive AI-powered quality tools.
        </p>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Quality Review
          </TabsTrigger>
          <TabsTrigger value="proofreading" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Proofreading
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Manuscript
              </CardTitle>
              <CardDescription>
                Upload your DOCX files for analysis and improvement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ManuscriptUploader />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Comprehensive Quality Review
              </CardTitle>
              <CardDescription>
                Unified analysis suite for structure, content, style, and readability
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeAnalysis} onValueChange={setActiveAnalysis} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="quality">Quality</TabsTrigger>
                  <TabsTrigger value="readability">Readability</TabsTrigger>
                  <TabsTrigger value="style">Style</TabsTrigger>
                  <TabsTrigger value="consistency">Consistency</TabsTrigger>
                </TabsList>

                <TabsContent value="quality" className="mt-6">
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Manuscript Quality Analysis</h3>
                    <ManuscriptQualityAnalyzer />
                  </div>
                </TabsContent>

                <TabsContent value="readability" className="mt-6">
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Readability & Flow Analysis</h3>
                    <ReadabilityAnalyzer />
                  </div>
                </TabsContent>

                <TabsContent value="style" className="mt-6">
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Style & Tone Consistency</h3>
                    <StyleConsistencyChecker />
                    {novel && (
                      <div className="mt-6">
                        <GrammarChecker novel={novel} />
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="consistency" className="mt-6">
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Character & Plot Consistency</h3>
                    {novel && <ConsistencyChecker novel={novel} />}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proofreading" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Professional Proofreading
              </CardTitle>
              <CardDescription>
                AI-powered proofreading for grammar, spelling, and style improvements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProofreadingAnalyzer />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}