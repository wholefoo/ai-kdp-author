import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Helmet } from "react-helmet-async";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  BookOpen, 
  FileText, 
  Sparkles, 
  Zap, 
  Check, 
  Crown, 
  Star,
  Users,
  Download,
  PenTool,
  Target,
  BarChart3,
  Megaphone,
  HelpCircle,
  Mail,
  Globe
} from "lucide-react";

export default function MarketingLanding() {
  const features = [
    {
      icon: BookOpen,
      title: "Complete Book Generation",
      description: "Generate full 50,000-80,000 word fiction and non-fiction books with 20-30 professionally structured chapters using GPT-5.2, ready for Amazon KDP publishing.",
      details: [
        "Powered by GPT-5.2 with GPT-4o fallback",
        "Fiction and non-fiction support with 17+ categories",
        "Customizable word count (30K-120K) and chapter count (10-50)",
        "Non-fiction includes source verification and automatic bibliography"
      ]
    },
    {
      icon: FileText,
      title: "Professional Manuscript Formatting",
      description: "Format your manuscripts to professional publishing standards with automated layout, typography, and export options for multiple platforms.",
      details: [
        "Industry-standard formatting with proper margins and typography",
        "Automated front matter, chapter headings, and page breaks",
        "Non-fiction bibliography with APA-style citations",
        "Multiple format exports optimized for different platforms"
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
      description: "Export books in multiple professional formats optimized for different publishing platforms and use cases.",
      details: [
        "Amazon KDP-ready DOCX formatting",
        "Non-fiction bibliography with APA-style citations",
        "Multiple export formats (PDF, TXT, Markdown)",
        "Professional manuscript submission formatting"
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
    },
    {
      icon: Megaphone,
      title: "Marketing & Promotion Tools",
      description: "AI-powered marketing toolkit to help promote your books with professional marketing content.",
      details: [
        "Book description and blurb generator",
        "Social media post creation for multiple platforms",
        "Email marketing content and newsletters",
        "Launch strategy and promotional materials"
      ]
    }
  ];

  const tutorials = [
    {
      title: "Getting Started: Your First Book",
      description: "Learn how to generate your first complete fiction or non-fiction book from idea to publication-ready manuscript in under 30 minutes.",
      steps: ["Choose fiction or non-fiction", "Set word count and style preferences", "Generate outline and review", "Create chapters automatically", "Export for publishing"]
    },
    {
      title: "Publishing to Amazon KDP",
      description: "Prepare and format your completed manuscript for successful publication on Amazon Kindle Direct Publishing.",
      steps: ["Format manuscript to KDP standards", "Generate front matter and table of contents", "Export as KDP-ready DOCX", "Create marketing description and metadata", "Upload to Amazon KDP"]
    },
    {
      title: "Character Development Workshop",
      description: "Use AI-powered tools to create compelling, consistent characters with detailed backstories and development arcs.",
      steps: ["Create character profiles", "Use AI Interview Mode", "Map emotional journeys", "Analyze character consistency", "Export character guides"]
    },
    {
      title: "Manuscript Quality Analysis",
      description: "Analyze and improve your books with comprehensive quality checking, style analysis, and improvement suggestions.",
      steps: ["Upload or select manuscript", "Run quality analyzer", "Review detailed feedback", "Apply suggested improvements", "Re-analyze and compare"]
    }
  ];

  const pricing = {
    monthly: 49,
    features: [
      "1 book per month (fiction & non-fiction)",
      "Complete 50K-80K word manuscripts",
      "Amazon KDP-ready formatting",
      "Character development tools",
      "Quality analysis tools",
      "Professional exports (DOCX, PDF)",
      "Priority AI processing",
      "Advanced style customization",
      "Priority support"
    ]
  };

  const faqs = [
    {
      question: "Can AI-generated books be published on Amazon KDP?",
      answer: "Yes, AI-generated content can be published on Amazon KDP. According to Amazon's content guidelines, you must have the rights to publish the content and it must meet their quality standards. AI KDP Author generates original content that you own full rights to publish. We recommend reviewing Amazon's latest KDP Content Guidelines before publishing."
    },
    {
      question: "How long does it take to generate a 50,000-80,000 word novel?",
      answer: "AI KDP Author generates complete novels in approximately 15-45 minutes depending on the word count and chapter complexity. A typical 60,000-word novel with 25 chapters takes about 25-30 minutes. The process includes outline generation, chapter-by-chapter writing with character consistency, and professional formatting."
    },
    {
      question: "Does AI KDP Author format manuscripts to KDP standards?",
      answer: "Yes, all exports are formatted specifically for Amazon KDP publishing. Our DOCX exports use industry-standard Aptos font, proper margins, chapter headings, page breaks, and front matter formatting. We also support PDF, TXT, and Markdown exports for different publishing needs."
    },
    {
      question: "What genres does AI KDP Author support?",
      answer: "AI KDP Author supports all major fiction genres including Romance, Mystery/Thriller, Science Fiction, Fantasy, Horror, Literary Fiction, Historical Fiction, Young Adult, and more. Each genre uses specialized AI prompts to ensure authentic genre conventions, tropes, and reader expectations are met."
    },
    {
      question: "How does the manuscript formatting work?",
      answer: "AI KDP Author automatically formats your manuscript to professional publishing standards. This includes proper margins, typography, chapter headings, page breaks, front matter, and table of contents — all optimized for Amazon KDP submission."
    },
    {
      question: "What word count and chapter options are available?",
      answer: "You can customize word count from 30,000 to 120,000 words, and chapter count from 10 to 50 chapters. Individual chapter lengths range from 1,500 to 5,000 words. The default settings (50,000-80,000 words, 20-30 chapters) are optimized for typical novel lengths on Amazon KDP."
    },
    {
      question: "Is there a free trial available?",
      answer: "Trial users can access the Manuscript Quality Analyzer feature to test our analysis capabilities. The full novel generation and export features require a Pro subscription at $49/month. We offer a 30-day money-back guarantee on all subscriptions."
    },
    {
      question: "What AI models power the novel generation?",
      answer: "AI KDP Author uses OpenAI's GPT-5.2 as the primary model for novel generation, with GPT-4o as a fallback. These advanced language models ensure high-quality, coherent storytelling with consistent characters, plot development, and genre-appropriate writing styles."
    }
  ];

  // JSON-LD structured data for SEO and AI visibility
  const jsonLdOrganization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "AI KDP Author",
    "url": "https://aikdpauthor.com",
    "logo": "https://aikdpauthor.com/logo.png",
    "description": "Professional AI-powered novel generation and publishing tools for Amazon KDP authors.",
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer support",
      "email": "support@aikdpauthor.com"
    }
  };

  const jsonLdWebsite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "AI KDP Author",
    "url": "https://aikdpauthor.com",
    "description": "Create professional, publishable novels of 50,000-80,000 words with AI for Amazon KDP publishing."
  };

  const jsonLdSoftwareApplication = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "AI KDP Author",
    "applicationCategory": "Writing Assistant",
    "operatingSystem": "Web Browser",
    "description": "AI-powered novel generation platform that creates complete 50,000-80,000 word novels with 20-30 chapters, professional manuscript formatting, and KDP-ready exports.",
    "featureList": [
      "Complete novel generation (50,000-80,000 words)",
      "20-30 professionally structured chapters",
      "GPT-5.2 powered content generation",
      "KDP-ready DOCX, PDF, TXT, Markdown exports",
      "Professional manuscript formatting",
      "Character consistency analyzer",
      "Narrative arc visualization",
      "AI-powered marketing content generation"
    ],
    "offers": {
      "@type": "Offer",
      "price": "29.00",
      "priceCurrency": "USD",
      "priceValidUntil": "2025-12-31",
      "availability": "https://schema.org/InStock"
    }
  };

  const jsonLdFaqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>AI KDP Author - Generate Complete Novels for Amazon KDP Publishing</title>
        <meta name="description" content="Create professional, publishable novels of 50,000-80,000 words with GPT-5.2. Generate complete manuscripts with 20-30 chapters, professional formatting, and marketing content. Perfect for Amazon KDP publishing." />
        <link rel="canonical" href="https://aikdpauthor.com/home" />
        <meta property="og:title" content="AI KDP Author - Generate Complete Novels for Amazon KDP Publishing" />
        <meta property="og:description" content="Create professional, publishable novels of 50,000-80,000 words with AI. Generate complete manuscripts with professional formatting and quality analysis tools." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://aikdpauthor.com/home" />
        <meta property="og:site_name" content="AI KDP Author" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="AI KDP Author - Generate Complete Novels for Amazon KDP" />
        <meta name="twitter:description" content="Create 50,000-80,000 word novels with GPT-5.2. Professional manuscript formatting. KDP-ready exports." />
        <script type="application/ld+json">{JSON.stringify(jsonLdOrganization)}</script>
        <script type="application/ld+json">{JSON.stringify(jsonLdWebsite)}</script>
        <script type="application/ld+json">{JSON.stringify(jsonLdSoftwareApplication)}</script>
        <script type="application/ld+json">{JSON.stringify(jsonLdFaqPage)}</script>
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
            From idea to publication-ready manuscript in minutes. Create 50,000-80,000 word novels with professional formatting and marketing content - all powered by GPT-5.2.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6 h-auto"
              onClick={() => window.location.href = '/subscribe'}
              data-testid="button-start-trial"
            >
              <Crown className="h-5 w-5 mr-2" />
              Start Creating Novels - $49/month
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
              <span>No setup fees</span>
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
              <div className="text-3xl font-bold text-green-600">17+</div>
              <div className="text-sm text-gray-600">Genre categories</div>
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
                Start Creating Novels - $49/month
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

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="flex justify-center mb-4">
              <HelpCircle className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-4xl font-bold mb-6">Frequently Asked Questions</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to know about AI KDP Author and publishing AI-generated novels on Amazon KDP
            </p>
          </div>
          
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`faq-${index}`} 
                className="bg-white rounded-lg border px-6"
                data-testid={`faq-item-${index}`}
              >
                <AccordionTrigger className="text-left font-semibold text-lg py-6 hover:no-underline" data-testid={`faq-trigger-${index}`}>
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 pb-6 leading-relaxed" data-testid={`faq-content-${index}`}>
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          
          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-4">
              Have more questions? Check out our comprehensive documentation or contact support.
            </p>
            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={() => window.location.href = '/docs'} data-testid="button-view-docs">
                View Documentation
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/about'} data-testid="button-contact-support">
                <Mail className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">How AI KDP Author Works</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From idea to published novel in four simple steps
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 text-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">1</div>
              <h3 className="font-semibold text-lg mb-2">Enter Your Idea</h3>
              <p className="text-gray-600 text-sm">Choose a genre, provide a title and plot idea. Select word count (30K-120K) and chapter count (10-50).</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 text-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">2</div>
              <h3 className="font-semibold text-lg mb-2">AI Generates Novel</h3>
              <p className="text-gray-600 text-sm">GPT-5.2 creates a detailed outline, then writes each chapter with consistent characters and plot development.</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 text-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">3</div>
              <h3 className="font-semibold text-lg mb-2">Review & Enhance</h3>
              <p className="text-gray-600 text-sm">Use our quality analyzer, character consistency checker, and AI-powered revision tools to perfect your manuscript.</p>
            </div>
            <div className="text-center">
              <div className="bg-orange-100 text-orange-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">4</div>
              <h3 className="font-semibold text-lg mb-2">Export & Publish</h3>
              <p className="text-gray-600 text-sm">Download KDP-ready DOCX with professional formatting and use AI marketing tools to launch your book.</p>
            </div>
          </div>
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
          <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <Crown className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold text-white">AI KDP Author</span>
              </div>
              <p className="text-sm leading-relaxed mb-4">
                Professional AI-powered novel generation and publishing tools for Amazon KDP authors. Create complete 50,000-80,000 word novels with professional formatting.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  <span>support@aikdpauthor.com</span>
                </div>
                <div className="flex items-center">
                  <Globe className="h-4 w-4 mr-2" />
                  <span>aikdpauthor.com</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Features</h4>
              <div className="space-y-2 text-sm">
                <div>Novel Generation (30K-120K words)</div>
                <div>Manuscript Formatting</div>
                <div>Character Development</div>
                <div>Quality Analysis</div>
                <div>Marketing Tools</div>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Account</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <a href="/api/login" className="hover:text-white transition-colors" data-testid="link-footer-login">Login</a>
                </div>
                <div>
                  <a href="/subscribe" className="hover:text-white transition-colors" data-testid="link-footer-subscribe">Subscribe ($49/mo)</a>
                </div>
                <div>
                  <a href="#faq" className="hover:text-white transition-colors" data-testid="link-footer-faq">FAQ</a>
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
                  <a href="/docs" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" data-testid="link-footer-docs">Documentation</a>
                </div>
                <div>
                  <a href="/privacy" className="hover:text-white transition-colors" data-testid="link-footer-privacy">Privacy Policy</a>
                </div>
                <div>
                  <a href="/terms" className="hover:text-white transition-colors" data-testid="link-footer-terms">Terms of Use</a>
                </div>
                <div>
                  <a href="/about" className="hover:text-white transition-colors" data-testid="link-footer-about">About Us</a>
                </div>
                <div>
                  <a href="https://kdp.amazon.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" data-testid="link-footer-kdp">Amazon KDP</a>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-8 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center text-sm">
              <p>&copy; 2025 AI KDP Author. All rights reserved.</p>
              <p className="mt-2 md:mt-0 text-gray-500">
                Powered by GPT-5.2
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}