import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Settings, Zap, Shield, BookOpen } from "lucide-react";

interface AdvancedSettingsProps {
  onToggle?: (enabled: boolean) => void;
}

export default function AdvancedSettings({ onToggle }: AdvancedSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState({
    strictCompliance: true,
    qualityEnforcement: true,
    contentFiltering: true,
    enhancedProofing: false,
    experimentalFeatures: false,
  });

  const handleSettingChange = (key: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    onToggle?.(Object.values({ ...settings, [key]: value }).some(Boolean));
  };

  return (
    <Card className="border-amber-200 bg-amber-50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-amber-100 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Settings className="h-5 w-5 text-amber-600" />
                <div>
                  <CardTitle className="text-amber-900">Advanced Settings</CardTitle>
                  <p className="text-sm text-amber-700">Fine-tune AI generation controls</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="bg-amber-200 text-amber-800">
                  {Object.values(settings).filter(Boolean).length} enabled
                </Badge>
                <ChevronDown className={`h-4 w-4 text-amber-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Strict Compliance */}
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
                <div className="flex items-center space-x-3">
                  <Zap className="h-5 w-5 text-blue-500" />
                  <div>
                    <h4 className="font-medium text-slate-900">Strict Compliance</h4>
                    <p className="text-sm text-slate-600">Enforce exact word count and chapter specifications</p>
                  </div>
                </div>
                <Switch
                  checked={settings.strictCompliance}
                  onCheckedChange={(checked) => handleSettingChange('strictCompliance', checked)}
                  data-testid="switch-strict-compliance"
                />
              </div>

              {/* Quality Enforcement */}
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-green-500" />
                  <div>
                    <h4 className="font-medium text-slate-900">Quality Enforcement</h4>
                    <p className="text-sm text-slate-600">Enhanced narrative consistency and quality controls</p>
                  </div>
                </div>
                <Switch
                  checked={settings.qualityEnforcement}
                  onCheckedChange={(checked) => handleSettingChange('qualityEnforcement', checked)}
                  data-testid="switch-quality-enforcement"
                />
              </div>

              {/* Content Filtering */}
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-purple-500" />
                  <div>
                    <h4 className="font-medium text-slate-900">Content Filtering</h4>
                    <p className="text-sm text-slate-600">Apply content rating restrictions automatically</p>
                  </div>
                </div>
                <Switch
                  checked={settings.contentFiltering}
                  onCheckedChange={(checked) => handleSettingChange('contentFiltering', checked)}
                  data-testid="switch-content-filtering"
                />
              </div>

              {/* Enhanced Proofing */}
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
                <div className="flex items-center space-x-3">
                  <BookOpen className="h-5 w-5 text-orange-500" />
                  <div>
                    <h4 className="font-medium text-slate-900">Enhanced Proofing</h4>
                    <p className="text-sm text-slate-600">Additional grammar and style checking (slower)</p>
                  </div>
                </div>
                <Switch
                  checked={settings.enhancedProofing}
                  onCheckedChange={(checked) => handleSettingChange('enhancedProofing', checked)}
                  data-testid="switch-enhanced-proofing"
                />
              </div>
            </div>

            {/* Information Panel */}
            <div className="bg-white border border-amber-200 rounded-lg p-4">
              <h4 className="font-medium text-slate-900 mb-2">Current Configuration</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">AI Model:</span>
                  <span className="font-medium">GPT-5.2 (Primary)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Generation Mode:</span>
                  <span className="font-medium">
                    {settings.strictCompliance ? 'Strict Compliance' : 'Flexible'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Quality Level:</span>
                  <span className="font-medium">
                    {settings.qualityEnforcement ? 'Enhanced' : 'Standard'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Processing Time:</span>
                  <span className="font-medium">
                    {settings.enhancedProofing ? 'Extended' : 'Standard'}
                  </span>
                </div>
              </div>
            </div>

            {/* Warning for experimental features */}
            {settings.experimentalFeatures && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-900">Experimental Features Active</h4>
                    <p className="text-sm text-red-700 mt-1">
                      Some features may be unstable. Monitor generation progress closely.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}