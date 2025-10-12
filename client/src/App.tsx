import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";
import { useAuth } from "@/hooks/useAuth";
import ConsolidatedHome from "./components/consolidated-home";
import MarketingLanding from "./pages/MarketingLanding";
import Subscribe from "./pages/Subscribe";
import AdminDashboard from "./pages/AdminDashboard";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";
import About from "./pages/About";
import Docs from "./pages/Docs";
import Documentation from "./pages/Documentation";
import Tutorials from "./pages/Tutorials";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import OutlineCreation from "./pages/docs/OutlineCreation";
import AICustomization from "./pages/docs/AICustomization";
import ChapterGeneration from "./pages/docs/ChapterGeneration";
import InterviewMode from "./pages/docs/InterviewMode";
import EmotionalJourney from "./pages/docs/EmotionalJourney";
import CharacterGrowth from "./pages/docs/CharacterGrowth";
import GrammarChecker from "./pages/docs/GrammarChecker";
import StyleConsistency from "./pages/docs/StyleConsistency";
import QualityReports from "./pages/docs/QualityReports";
import VoiceSelection from "./pages/docs/VoiceSelection";
import AudioSettings from "./pages/docs/AudioSettings";
import BackgroundMusic from "./pages/docs/BackgroundMusic";
import DOCXPDFFormatting from "./pages/docs/DOCXPDFFormatting";
import KDPPreparation from "./pages/docs/KDPPreparation";
import CoverDesign from "./pages/docs/CoverDesign";
import NotFound from "./pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={MarketingLanding} />
          <Route path="/home" component={MarketingLanding} />
          <Route path="/subscribe" component={Subscribe} />
          <Route path="/privacy" component={PrivacyPolicy} />
          <Route path="/terms" component={TermsOfUse} />
          <Route path="/about" component={About} />
          <Route path="/docs" component={Docs} />
          <Route path="/documentation" component={Documentation} />
          <Route path="/tutorials" component={Tutorials} />
          <Route path="/docs/outline-creation" component={OutlineCreation} />
          <Route path="/docs/ai-customization" component={AICustomization} />
          <Route path="/docs/chapter-generation" component={ChapterGeneration} />
          <Route path="/docs/interview-mode" component={InterviewMode} />
          <Route path="/docs/emotional-journey" component={EmotionalJourney} />
          <Route path="/docs/character-growth" component={CharacterGrowth} />
          <Route path="/docs/grammar-checker" component={GrammarChecker} />
          <Route path="/docs/style-consistency" component={StyleConsistency} />
          <Route path="/docs/quality-reports" component={QualityReports} />
          <Route path="/docs/voice-selection" component={VoiceSelection} />
          <Route path="/docs/audio-settings" component={AudioSettings} />
          <Route path="/docs/background-music" component={BackgroundMusic} />
          <Route path="/docs/docx-pdf-formatting" component={DOCXPDFFormatting} />
          <Route path="/docs/kdp-preparation" component={KDPPreparation} />
          <Route path="/docs/cover-design" component={CoverDesign} />
          <Route path="/blog" component={Blog} />
          <Route path="/blog/:slug" component={BlogPost} />
        </>
      ) : (
        <>
          <Route path="/" component={ConsolidatedHome} />
          <Route path="/home" component={MarketingLanding} />
          <Route path="/subscribe" component={Subscribe} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/privacy" component={PrivacyPolicy} />
          <Route path="/terms" component={TermsOfUse} />
          <Route path="/about" component={About} />
          <Route path="/docs" component={Docs} />
          <Route path="/documentation" component={Documentation} />
          <Route path="/tutorials" component={Tutorials} />
          <Route path="/docs/outline-creation" component={OutlineCreation} />
          <Route path="/docs/ai-customization" component={AICustomization} />
          <Route path="/docs/chapter-generation" component={ChapterGeneration} />
          <Route path="/docs/interview-mode" component={InterviewMode} />
          <Route path="/docs/emotional-journey" component={EmotionalJourney} />
          <Route path="/docs/character-growth" component={CharacterGrowth} />
          <Route path="/docs/grammar-checker" component={GrammarChecker} />
          <Route path="/docs/style-consistency" component={StyleConsistency} />
          <Route path="/docs/quality-reports" component={QualityReports} />
          <Route path="/docs/voice-selection" component={VoiceSelection} />
          <Route path="/docs/audio-settings" component={AudioSettings} />
          <Route path="/docs/background-music" component={BackgroundMusic} />
          <Route path="/docs/docx-pdf-formatting" component={DOCXPDFFormatting} />
          <Route path="/docs/kdp-preparation" component={KDPPreparation} />
          <Route path="/docs/cover-design" component={CoverDesign} />
          <Route path="/blog" component={Blog} />
          <Route path="/blog/:slug" component={BlogPost} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
