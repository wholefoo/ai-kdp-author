import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Helmet } from "react-helmet-async";
import { 
  BookOpen, 
  Headphones, 
  Sparkles, 
  Zap, 
  Check, 
  Crown, 
  Star,
  Users,
  Download,
  PenTool,
  Target,
  BarChart3
} from "lucide-react";

export default function MarketingLanding() {
  const features = [
    {
      icon: BookOpen,
      title: "Complete Novel Generation",
      description: "Generate full 50,000-80,000 word novels with 20-30 professionally structured chapters, ready for Amazon KDP publishing.",
      details: [
        "Customizable word count (30K-120K)",
        "Multiple genres and writing styles", 
        "Character development and plot consistency",
        "Professional manuscript formatting"
      ]
    },
    {
      icon: Headphones,
      title: "Professional Audiobook Creation",
      description: "Transform your novels into high-quality audiobooks with multiple voice options, speeds, and professional audio formats.",
      details: [
        "6 premium AI voices (Alloy, Echo, Fable, Onyx, Nova, Shimmer)",
        "Adjustable narration speed (25-400%)",
        "Multiple audio formats (MP3, Opus, AAC, FLAC)",
        "Chapter-by-chapter generation with metadata"
      ]
    },
    {
      icon: Sparkles,
      title: "Advanced AI Analysis Tools",
      description: "Comprehensive manuscript analysis including character consistency, narrative arc visualization, and style checking.",
      details: [
        "Character consistency analyzer with detailed reports",
        "Narrative arc visualization with emotional journey mapping",
        "Style and tone consistency checker",
        "Grammar and readability analysis"
      ]
    },
    {
      icon: PenTool,
      title: "Interactive Writing Tools",
      description: "Character Development Workshop, Plot Inspiration Vault, and AI-powered writing assistance for creative enhancement.",
      details: [
        "Character Interview Mode with AI guidance",
        "Plot idea generation and management",
        "Chapter revision suggestions",
        "Writing style customization"
      ]
    },
    {
      icon: Target,
      title: "Publishing-Ready Output",
      description: "Export novels in multiple professional formats optimized for different publishing platforms and use cases.",
      details: [
        "Amazon KDP-ready DOCX formatting",
        "Multiple export formats (PDF, TXT, Markdown)",
        "Professional manuscript submission formatting",
        "Customizable styling and layout options"
      ]
    },
    {
      icon: BarChart3,
      title: "Quality Control & Analytics",
      description: "Advanced quality analysis, readability scoring, and comprehensive manuscript improvement suggestions.",
      details: [
        "Manuscript Quality Analyzer with actionable feedback",
        "Readability scoring and improvement tips",
        "Content quality validation",
        "Progress tracking and metrics"
      ]
    }
  ];

  const tutorials = [
    {
      title: "Getting Started: Your First Novel",
      description: "Learn how to generate your first complete novel from idea to publication-ready manuscript in under 30 minutes.",
      steps: ["Choose genre and theme", "Set word count and style preferences", "Generate outline and review", "Create chapters automatically", "Export for publishing"]
    },
    {
      title: "Creating Professional Audiobooks",
      description: "Transform your written novels into engaging audiobooks with professional-quality narration and audio formatting.",
      steps: ["Select completed novel", "Choose voice and speed settings", "Configure audio format", "Generate audiobook chapters", "Download complete audiobook"]
    },
    {
      title: "Character Development Workshop",
      description: "Use AI-powered tools to create compelling, consistent characters with detailed backstories and development arcs.",
      steps: ["Create character profiles", "Use AI Interview Mode", "Map emotional journeys", "Analyze character consistency", "Export character guides"]
    },
    {
      title: "Manuscript Quality Analysis",
      description: "Analyze and improve your novels with comprehensive quality checking, style analysis, and improvement suggestions.",
      steps: ["Upload or select manuscript", "Run quality analyzer", "Review detailed feedback", "Apply suggested improvements", "Re-analyze and compare"]
    }
  ];

  const pricing = {
    monthly: 49,
    features: [
      "Complete audiobook creation",
      "Advanced AI analysis tools",
      "Character development workshop",
      "Plot inspiration vault",
      "Publishing-ready exports",
      "Quality control analytics",
      "Premium support"
    ]
  };

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>AI KDP Author - Generate Complete Novels for Amazon KDP Publishing</title>
        <meta name="description" content="Create professional, publishable novels of 50,000-80,000 words with AI. Generate complete manuscripts, audiobooks, and get quality analysis tools. Perfect for Amazon KDP publishing with built-in formatting." />
        <link rel="canonical" href="https://ai-kdp-author.com/home" />
        <meta property="og:title" content="AI KDP Author - Generate Complete Novels for Amazon KDP Publishing" />
        <meta property="og:description" content="Create professional, publishable novels of 50,000-80,000 words with AI. Generate complete manuscripts, audiobooks, and get quality analysis tools." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://ai-kdp-author.com/home" />
      </Helmet>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-purple-50 py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex justify-center mb-6">
            <Badge variant="outline" className="px-4 py-2 text-lg border-primary/20">
              <Crown className="h-4 w-4 mr-2" />
              Professional AI Novel Generation
            </Badge>
          </div>
          
          <a href="/home" className="inline-block" data-testid="link-header-title">
            <h1 className="text-5xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity cursor-pointer">
              AI KDP Author
            </h1>
          </a>
          
          <p className="text-2xl lg:text-3xl text-gray-600 mb-4 max-w-4xl mx-auto">
            Generate complete, publishable novels for Amazon KDP
          </p>
          
          <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
            From idea to publication-ready manuscript in minutes. Create 50,000-80,000 word novels, audiobooks, and comprehensive analysis tools - all powered by advanced AI.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6 h-auto"
              onClick={() => window.location.href = '/subscribe'}
              data-testid="button-start-trial"
            >
              <Crown className="h-5 w-5 mr-2" />
              Start Creating Novels - $29/month
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 py-6 h-auto"
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-login"
            >
              Login to Account
            </Button>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
            <div className="flex items-center">
              <Check className="h-4 w-4 text-green-600 mr-2" />
              <span>30-day money-back guarantee</span>
            </div>
            <div className="flex items-center">
              <Check className="h-4 w-4 text-green-600 mr-2" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center">
              <Check className="h-4 w-4 text-green-600 mr-2" />
              <span>Unlimited novels</span>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-blue-600">50K-80K</div>
              <div className="text-sm text-gray-600">Words per novel</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-purple-600">20-30</div>
              <div className="text-sm text-gray-600">Chapters generated</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-green-600">6</div>
              <div className="text-sm text-gray-600">AI voice options</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-orange-600">Multiple</div>
              <div className="text-sm text-gray-600">Export formats</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Everything You Need to Publish Novels</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Professional-grade AI tools for novel creation, analysis, and publication preparation
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <div className="bg-primary/10 p-3 rounded-lg">
                      <feature.icon className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                  <div className="space-y-2">
                    {feature.details.map((detail, idx) => (
                      <div key={idx} className="flex items-start space-x-2">
                        <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-600">{detail}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Tutorials Section */}
      <section id="tutorials" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Complete Tutorials & Guides</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Step-by-step guides to master every aspect of AI novel creation and publishing
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {tutorials.map((tutorial, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-start space-x-3">
                    <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{tutorial.title}</CardTitle>
                      <CardDescription className="mt-2">
                        {tutorial.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-gray-700 uppercase tracking-wide">Steps:</h4>
                    <div className="space-y-2">
                      {tutorial.steps.map((step, idx) => (
                        <div key={idx} className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">
                            {idx + 1}
                          </div>
                          <span className="text-sm text-gray-600">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="mb-16">
            <h2 className="text-4xl font-bold mb-6">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600">
              Everything you need to create and publish professional novels
            </p>
          </div>
          
          <Card className="border-2 border-primary/20 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 to-purple-600"></div>
            
            <CardHeader className="text-center pb-8 pt-8">
              <div className="flex justify-center mb-4">
                <Crown className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-3xl">AI KDP Author Pro</CardTitle>
              <CardDescription className="text-lg mt-2">
                Complete novel generation and publishing suite
              </CardDescription>
              <div className="mt-6">
                <span className="text-5xl font-bold">${pricing.monthly}</span>
                <span className="text-xl text-gray-600">/month</span>
              </div>
            </CardHeader>
            
            <CardContent className="px-8 pb-8">
              <div className="space-y-4 mb-8">
                {pricing.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-left">{feature}</span>
                  </div>
                ))}
              </div>
              
              <Button 
                size="lg" 
                className="w-full text-lg py-6"
                onClick={() => window.location.href = '/subscribe'}
                data-testid="button-subscribe"
              >
                <Crown className="h-5 w-5 mr-2" />
                Start Creating Novels Now
              </Button>
              
              <div className="mt-6 pt-6 border-t">
                <div className="flex justify-center space-x-6 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-green-600 mr-1" />
                    <span>30-day guarantee</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-green-600 mr-1" />
                    <span>Cancel anytime</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-green-600 mr-1" />
                    <span>No setup fees</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Publish Your First AI Novel?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of authors who are already creating bestselling novels with AI KDP Author
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              variant="secondary"
              className="text-lg px-8 py-6 h-auto"
              onClick={() => window.location.href = '/subscribe'}
              data-testid="button-get-started"
            >
              <Crown className="h-5 w-5 mr-2" />
              Get Started Today
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-6 h-auto border-white text-white hover:bg-white hover:text-blue-600"
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-login-cta"
            >
              Login to Account
            </Button>
          </div>
          
          <div className="mt-8 text-sm opacity-80">
            <p>Start your publishing journey today • No contracts • Cancel anytime</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-gray-300">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Crown className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold text-white">AI KDP Author</span>
              </div>
              <p className="text-sm leading-relaxed">
                Professional AI-powered novel generation and publishing tools for Amazon KDP authors.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Features</h4>
              <div className="space-y-2 text-sm">
                <div>Novel Generation</div>
                <div>Audiobook Creation</div>
                <div>Character Development</div>
                <div>Quality Analysis</div>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Account</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <a href="/api/login" className="hover:text-white transition-colors" data-testid="link-footer-login">Login</a>
                </div>
                <div>
                  <a href="/subscribe" className="hover:text-white transition-colors" data-testid="link-footer-subscribe">Subscribe</a>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <a href="/home" className="hover:text-white transition-colors" data-testid="link-footer-home">Home</a>
                </div>
                <div>
                  <a href="/blog" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" data-testid="link-footer-blog">Blog</a>
                </div>
                <div>
                  <a href="/docs" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" data-testid="link-footer-docs">Docs</a>
                </div>
                <div>
                  <a href="/privacy" className="hover:text-white transition-colors" data-testid="link-footer-privacy">Privacy Policy</a>
                </div>
                <div>
                  <a href="/terms" className="hover:text-white transition-colors" data-testid="link-footer-terms">Terms of Use</a>
                </div>
                <div>
                  <a href="/about" className="hover:text-white transition-colors" data-testid="link-footer-about">About</a>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm">
            <p>&copy; 2025 AI KDP Author. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}