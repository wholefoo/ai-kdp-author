import { ManuscriptExportWizard } from "@/components/manuscript-export-wizard";

export default function ManuscriptExportPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <ManuscriptExportWizard />
      </div>
    </div>
  );
}