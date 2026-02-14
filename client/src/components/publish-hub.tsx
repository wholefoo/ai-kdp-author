import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, LibraryIcon, FileText, Megaphone } from "lucide-react";
import { ManuscriptExportWizard } from "./manuscript-export-wizard";
import ManuscriptExport from "./manuscript-export";
import PromotionHub from "./promotion-hub";
import Library from "../pages/library";
import type { Novel } from "@shared/schema";

interface PublishHubProps {
  novel?: Novel;
}

export default function PublishHub({ novel }: PublishHubProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-slate-900">Publish Your Work</h2>
        <p className="text-slate-600 max-w-2xl mx-auto">
          Export your finished novels in professional formats ready for Amazon KDP and more.
        </p>
      </div>

      <Tabs defaultValue="library" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="library" className="flex items-center gap-2" data-testid="tab-library">
            <LibraryIcon className="h-4 w-4" />
            My Novels
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2" data-testid="tab-export">
            <Download className="h-4 w-4" />
            Export Wizard
          </TabsTrigger>
          <TabsTrigger value="formats" className="flex items-center gap-2" data-testid="tab-formats">
            <FileText className="h-4 w-4" />
            Quick Export
          </TabsTrigger>
          <TabsTrigger value="promote" className="flex items-center gap-2" data-testid="tab-promote">
            <Megaphone className="h-4 w-4" />
            Promote
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LibraryIcon className="h-5 w-5" />
                Novel Library
              </CardTitle>
              <CardDescription>
                Manage your completed novels and access publishing tools
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Library />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Professional Export Wizard
              </CardTitle>
              <CardDescription>
                Configure and export your manuscripts with custom formatting options
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ManuscriptExportWizard />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="formats" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Quick Export Options
              </CardTitle>
              <CardDescription>
                Instant export in common formats for immediate use
              </CardDescription>
            </CardHeader>
            <CardContent>
              {novel && <ManuscriptExport novel={novel} />}
              {!novel && (
                <div className="text-center py-8 text-slate-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a novel from your library to access quick export options</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promote" className="space-y-6">
          <PromotionHub novel={novel} />
        </TabsContent>
      </Tabs>
    </div>
  );
}