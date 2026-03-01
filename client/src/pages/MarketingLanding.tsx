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
  Globe,
  Rocket,
  FlaskConical,
  Search
} from "lucide-react";

export default function MarketingLanding() {
  const features = [
    {
      icon: BookOpen,
      title: "Complete Book Generation",
      description: "Generate full 50,000-80,000 word fiction and non-fiction books with 20-30 professionally structured chapters using GPT-5.2, ready for Amazon KDP publishing.",
      details: [
        "Powered by GPT-5.2 — the most advanced AI writing model available",
        "Fiction and non-fiction support across 17+ genre categories",
        "Customizable word count (30K-120K) and chapter count (10-50)",
        "Non-fiction includes multi-source fact verification and automatic APA bibliography"
      ]
    },
    {
      icon: FlaskConical,
      title: "Research Module",
      description: "Conduct thorough, verified subject matter research from credible academic, journalistic, and expert sources — then use it to generate a complete fiction plot or non-fiction book outline.",
      details: [
        "Research any topic using credible academic papers, books, and reputable publications",
        "Automatically excludes unreliable sources (Wikipedia, Reddit, Quora, etc.)",
        "Convert research findings into a complete fiction plot with characters and chapter structure",
        "Convert research findings into a full non-fiction book outline with chapter-by-chapter key points",
        "Pre-fills the manuscript generator so you can write from a foundation of real facts"
      ]
    },
    {
      icon: FileText,
      title: "Professional Manuscript Formatting",
      description: "Every book is automatically formatted to professional publishing standards — Aptos font, 6×9 trade paperback layout, proper front matter, chapter headings, and KDP-ready exports.",
      details: [
        "6×9 trade paperback format with Aptos 11pt font and proper margins",
        "Automated front matter: title page, copyright, dedication, acknowledgements, table of contents",
        "Chapter headings formatted as 'Chapter 1: Title Name' — each starting on a new page",
        "Export as DOCX (KDP-ready), PDF, TXT, or Markdown"
      ]
    },
    {
      icon: Sparkles,
      title: "Advanced AI Analysis Tools",
      description: "Comprehensive manuscript analysis including character consistency, narrative arc visualization, style and tone checking, proofreading, and readability scoring.",
      details: [
        "Character consistency analyzer — catches contradictions across all chapters",
        "Narrative arc visualization — see your story's emotional journey plotted across chapters",
        "Style and tone consistency checker — ensures your voice stays uniform throughout",
        "Advanced grammar, proofreading, and readability analysis with actionable suggestions"
      ]
    },
    {
      icon: PenTool,
      title: "Character Development Workshop",
      description: "Build compelling, well-rounded characters with AI-powered tools — from detailed profiles and backstories to emotional journey mapping and AI interview sessions.",
      details: [
        "AI Interview Mode — have a guided conversation to flesh out each character's voice and history",
        "Emotional Journey Mapping — visualize how characters evolve chapter by chapter",
        "Character growth suggestions to deepen arcs and avoid flat portrayals",
        "Character consistency reports tied to your manuscript"
      ]
    },
    {
      icon: Target,
      title: "Plot Inspiration & Genre Wizard",
      description: "Overcome creative blocks with the Plot Inspiration Vault and Genre Exploration Wizard — get AI-generated plot concepts by genre and save the ones you love.",
      details: [
        "Genre Exploration Wizard covers all major fiction genres with tailored plot suggestions",
        "Plot Inspiration Vault to save, organize, and revisit your best ideas",
        "One-click transfer from saved plots to the manuscript generator",
        "AI-powered premise and plot concept generation on demand"
      ]
    },
    {
      icon: BarChart3,
      title: "Manuscript Quality Analyzer",
      description: "Run a full quality audit of any manuscript — whether generated here or uploaded from elsewhere — and get specific, actionable improvement suggestions.",
      details: [
        "Comprehensive quality scoring across multiple dimensions",
        "Grammar, style, and readability analysis with improvement tips",
        "Content quality validation and pacing feedback",
        "Available to trial users — test it free before subscribing"
      ]
    },
    {
      icon: Megaphone,
      title: "Marketing & Promotion Toolkit",
      description: "AI-powered marketing content generation to help you launch and promote your book across all major channels.",
      details: [
        "Amazon KDP book descriptions, keywords, and category recommendations",
        "Social media posts for Instagram, Twitter, Facebook, and LinkedIn",
        "Email newsletters and launch announcements",
        "Press releases, book blurbs, elevator pitches, and launch strategy timelines"
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
      title: "Research-to-Book Workflow",
      description: "Use the Research Module to build books grounded in verified facts — ideal for both historically-accurate fiction and authoritative non-fiction.",
      steps: ["Enter a topic in the Research tab", "AI gathers findings from credible sources", "Generate a fiction plot or non-fiction outline from the research", "Review and refine the structure", "Send directly to the book generator — pre-filled and ready to go"]
    },
    {
      title: "Publishing to Amazon KDP",
      description: "Prepare and format your completed manuscript for successful publication on Amazon Kindle Direct Publishing.",
      steps: ["Format manuscript to KDP standards", "Generate front matter and table of contents", "Export as KDP-ready DOCX", "Create marketing description and metadata", "Upload to Amazon KDP"]
    },
    {
      title: "Character Development Workshop",
      description: "Use AI-powered tools to create compelling, consistent characters with detailed backstories and development arcs.",
      steps: ["Create character profiles", "Use AI Interview Mode for guided character building", "Map emotional journeys across chapters", "Run character consistency analysis", "Apply growth suggestions to deepen arcs"]
    },
    {
      title: "Manuscript Quality Analysis",
      description: "Analyze and improve your books with comprehensive quality checking, style analysis, and improvement suggestions.",
      steps: ["Upload or select manuscript", "Run quality analyzer", "Review detailed feedback", "Apply suggested improvements", "Re-analyze and compare results"]
    },
    {
      title: "Marketing Your Book",
      description: "Generate a complete marketing package for your book — from Amazon descriptions and keywords to social media posts and launch strategy.",
      steps: ["Select your completed book", "Open the Promote section", "Generate Amazon description and keywords", "Create social media posts for all platforms", "Download your complete marketing package"]
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
      question: "What is the Research Module and how does it work?",
      answer: "The Research Module lets you conduct deep, structured research on any subject — and then use those findings to build either a fiction plot or a non-fiction book outline. You enter a topic, and the AI gathers key findings, themes, verified sources, statistics, historical context, and suggested angles from credible academic papers, books, official publications, and reputable news sources. Unreliable sources (Wikipedia, Reddit, Quora, etc.) are automatically excluded. Once research is complete, you can convert it into a fiction plot with a full three-act structure and character profiles, or a non-fiction book outline with chapter-by-chapter key points and source citations. One click then pre-fills the manuscript generator, ready to write."
    },
    {
      question: "How long does it take to generate a complete book?",
      answer: "AI KDP Author generates complete books in approximately 15-45 minutes depending on the word count and chapter complexity. A typical 60,000-word novel with 25 chapters takes about 25-30 minutes. The process includes outline generation, chapter-by-chapter writing with character consistency, and professional formatting — all fully automated."
    },
    {
      question: "What types of books can I create — fiction and non-fiction?",
      answer: "AI KDP Author supports both fiction and non-fiction. For fiction, you can create novels across all major genres including Romance, Mystery/Thriller, Science Fiction, Fantasy, Horror, Literary Fiction, Historical Fiction, Young Adult, and more. For non-fiction, we support 17+ categories including self-help, business, health, history, science, and technology. Non-fiction books include multi-source fact verification, automatic APA-style bibliography generation, and exclusion of unreliable sources like Wikipedia and Reddit."
    },
    {
      question: "What word count and chapter options are available?",
      answer: "You have full control over your book's structure. Adjust word count from 30,000 to 120,000 words, chapter count from 10 to 50 chapters, and individual chapter length from 1,500 to 5,000 words. The default settings (50,000-80,000 words, 20-30 chapters) are optimized for typical book lengths on Amazon KDP."
    },
    {
      question: "How does the manuscript formatting work?",
      answer: "Every book is automatically formatted to professional publishing standards. DOCX exports follow a trade paperback format (6×9 inches) with Aptos 11pt font, proper margins, and clean left-aligned text. Front matter includes a title page, copyright page, dedication, acknowledgements, and table of contents. Each chapter starts on a new page with a formatted heading like 'Chapter 1: Title Name'. We also offer PDF, TXT, and Markdown exports."
    },
    {
      question: "What is the Character Development Workshop?",
      answer: "The Character Development Workshop is an interactive suite of AI-powered tools for building compelling characters. It includes an AI Interview Mode where you can have a conversation with AI to flesh out your characters, Emotional Journey Mapping to visualize how your characters evolve through the story, and Character Growth Suggestions that offer ideas for deepening character arcs. These tools help ensure your characters are well-rounded and consistent throughout the novel."
    },
    {
      question: "How does the Manuscript Quality Analyzer work?",
      answer: "The Manuscript Quality Analyzer is a comprehensive review tool that evaluates your book across multiple dimensions. It includes an Advanced Grammar & Style Checker, a Style and Tone Consistency Checker to ensure your voice stays uniform throughout the book, a Readability Scorer with improvement tips, and a Content Quality Validator. You receive actionable feedback and suggestions to bring your manuscript to a professional standard. Trial users can access this feature for free."
    },
    {
      question: "What is the Plot Inspiration Vault?",
      answer: "The Plot Inspiration Vault is a tool that helps you discover and develop book ideas. You can explore plot concepts by genre, save ideas you like, and use them as the starting point for full book generation. It's great for overcoming writer's block or finding fresh angles for your next project."
    },
    {
      question: "What marketing and promotion tools are included?",
      answer: "Every subscription includes a full AI-powered marketing toolkit. You can generate professional book descriptions and blurbs, create social media posts tailored for platforms like Instagram, Twitter, and Facebook, write email newsletters and launch announcements, and develop a complete promotional strategy — all with a single click. Marketing content is generated using GPT-4.1-mini to keep costs efficient."
    },
    {
      question: "How does non-fiction source verification work?",
      answer: "For non-fiction books, AI KDP Author uses multi-source fact verification to ensure accuracy. The system cross-references claims against credible sources like academic papers, official publications, and reputable news outlets. Unreliable sources such as Wikipedia, Reddit, Quora, and Yahoo Answers are automatically excluded. Each chapter references multiple credible sources, and a complete APA-style bibliography is generated at the end of the book."
    },
    {
      question: "Can I customize the writing style and tone?",
      answer: "Yes, you have extensive control over how your book reads. You can set the writing style (literary, conversational, formal, etc.), tone and mood (dark, humorous, inspirational, etc.), and content rating (clean, moderate, mature). You can also provide custom instructions to guide the AI's approach. For fiction, you can select your genre to ensure the writing follows genre-specific conventions and reader expectations."
    },
    {
      question: "What are the subscription plans and pricing?",
      answer: "We offer two plans. Pro is $49/month and includes 1 book per month, full generation for fiction and non-fiction, all analysis and formatting tools, marketing content generation, character development tools, and professional exports. Founders is a one-time payment of $2,500 for lifetime access with 5 books per month — ideal for power users and publishing businesses. Both plans include a 30-day money-back guarantee."
    },
    {
      question: "Is there a free trial available?",
      answer: "Trial users can access the Refine feature, which includes the Manuscript Quality Analyzer, to test our analysis capabilities for free. The full book generation (Create) and export/sharing features (Publish) require a Pro or Founders subscription. We offer a 30-day money-back guarantee so you can try the full experience risk-free."
    },
    {
      question: "What AI models power the book generation?",
      answer: "AI KDP Author uses OpenAI's GPT-5.2 as the primary model for all book generation and analysis tasks, delivering the highest quality output. GPT-4.1-mini is used as a cost-efficient model for marketing content and lighter tasks. These advanced models ensure high-quality, coherent writing with consistent characters, accurate facts, and genre-appropriate styles."
    },
    {
      question: "What export formats are available?",
      answer: "You can export your completed books in multiple formats: DOCX (formatted for Amazon KDP with professional layout, front matter, and chapter formatting), PDF (for review and other publishing platforms), TXT (plain text), and Markdown (for flexible digital use). The DOCX format follows a professional 6×9 trade paperback layout with Aptos font, proper margins, and all front matter included."
    },
    {
      question: "Do I own the rights to my generated books?",
      answer: "Yes, you retain full ownership and rights to all content generated through AI KDP Author. You are free to publish, sell, and distribute your books on Amazon KDP or any other platform. The content is original and created specifically for you."
    },
    {
      question: "How does the Narrative Arc Visualization tool work?",
      answer: "The Narrative Arc Visualization tool creates a visual chart of your story's emotional journey across all chapters. It maps the tension, conflict, and resolution points so you can see at a glance whether your story has a satisfying dramatic shape. This helps you identify pacing issues or flat spots before publishing."
    },
    {
      question: "Can I revise individual chapters after generation?",
      answer: "Yes, AI KDP Author includes AI-powered chapter revision tools. After your book is generated, you can select any chapter and request targeted revisions — such as adjusting tone, adding more detail, strengthening dialogue, or improving pacing. The AI applies your requested changes while maintaining consistency with the rest of the book."
    }
  ];

  // JSON-LD structured data for SEO and AI visibility
  const jsonLdOrganization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "AI KDP Author",
    "url": "https://aikdpauthor.com",
    "logo": "https://aikdpauthor.com/logo.png",
    "description": "Professional AI-powered book writing platform for Amazon KDP authors — fiction and non-fiction, with research, formatting, quality analysis, and marketing tools.",
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
    "description": "Create professional, publishable fiction and non-fiction books of 50,000-80,000 words with AI. Research any topic, generate a complete manuscript, format it for KDP, and market it — all in one platform."
  };

  const jsonLdSoftwareApplication = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "AI KDP Author",
    "applicationCategory": "Writing Assistant",
    "operatingSystem": "Web Browser",
    "description": "Complete AI-powered book writing platform for Amazon KDP. Research any topic from credible sources, generate 50,000-80,000 word fiction or non-fiction manuscripts, format to KDP standards, and launch with professional marketing content.",
    "featureList": [
      "Research Module — verified subject matter research from credible academic and journalistic sources",
      "Complete fiction and non-fiction book generation (50,000-80,000 words)",
      "Research-to-fiction plot generation and research-to-nonfiction outline generation",
      "GPT-5.2 powered content generation",
      "KDP-ready DOCX, PDF, TXT, Markdown exports",
      "Professional 6×9 manuscript formatting with Aptos font and front matter",
      "Character Development Workshop with AI Interview Mode and Emotional Journey Mapping",
      "Character consistency analyzer and narrative arc visualization",
      "Manuscript Quality Analyzer, proofreading, style and tone checker",
      "AI-powered marketing content generation (Amazon, social media, email, press release)"
    ],
    "offers": {
      "@type": "Offer",
      "price": "49.00",
      "priceCurrency": "USD",
      "priceValidUntil": "2026-12-31",
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
        <title>AI KDP Author - Generate Complete Fiction & Non-Fiction Books for Amazon KDP</title>
        <meta name="description" content="Create professional, publishable fiction and non-fiction books of 50,000-80,000 words with GPT-5.2. Research any topic from credible sources, generate a complete manuscript, format it for KDP, and launch with AI-powered marketing tools." />
        <link rel="canonical" href="https://aikdpauthor.com/home" />
        <meta property="og:title" content="AI KDP Author - Generate Complete Fiction & Non-Fiction Books for Amazon KDP" />
        <meta property="og:description" content="From research to published book in minutes. AI-verified research, 50K-80K word manuscripts, professional KDP formatting, character tools, quality analysis, and a full marketing toolkit — all powered by GPT-5.2." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://aikdpauthor.com/home" />
        <meta property="og:site_name" content="AI KDP Author" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="AI KDP Author - Complete AI Book Writing Platform for Amazon KDP" />
        <meta name="twitter:description" content="Research, write, format, and market your book — fiction or non-fiction. GPT-5.2 powered. 50K-80K words. KDP-ready." />
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
            Generate complete, publishable fiction and non-fiction books for Amazon KDP
          </p>
          
          <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
            From research and idea to publication-ready manuscript in minutes. 50,000-80,000 word books with AI-verified research, professional formatting, and a full marketing toolkit — all powered by GPT-5.2.
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
              <div className="text-sm text-gray-600">Words per book</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-purple-600">17+</div>
              <div className="text-sm text-gray-600">Fiction & non-fiction categories</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-green-600">8+</div>
              <div className="text-sm text-gray-600">Integrated AI tools</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-orange-600">4</div>
              <div className="text-sm text-gray-600">Export formats (DOCX, PDF, TXT, MD)</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Everything You Need to Publish Your Book</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              A complete AI-powered suite — from research and writing to analysis, formatting, and marketing
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
              Step-by-step guides to master every aspect of AI book creation, research, and publishing
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

      {/* Value Proposition Chart */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-4">Why AI KDP Author?</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              See how our plans compare to the traditional cost of writing and publishing a book
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
              <thead>
                <tr>
                  <th className="text-left p-4 border-b-2 border-primary/20 font-semibold text-lg"></th>
                  <th className="text-center p-4 border-b-2 border-primary bg-primary/5 font-semibold text-lg">
                    <div className="flex flex-col items-center gap-1">
                      <Star className="h-6 w-6 text-primary" />
                      <span>Pro</span>
                      <span className="text-sm font-normal text-gray-600">$49/month</span>
                    </div>
                  </th>
                  <th className="text-center p-4 border-b-2 border-amber-400 bg-amber-50 font-semibold text-lg">
                    <div className="flex flex-col items-center gap-1">
                      <Rocket className="h-6 w-6 text-amber-500" />
                      <span>Founders</span>
                      <span className="text-sm font-normal text-gray-600">$2,500 one-time</span>
                    </div>
                  </th>
                  <th className="text-center p-4 border-b-2 border-gray-300 font-semibold text-lg">
                    <div className="flex flex-col items-center gap-1">
                      <BookOpen className="h-6 w-6 text-gray-500" />
                      <span>Traditional</span>
                      <span className="text-sm font-normal text-gray-600">Industry Average</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-4 font-medium">Cost per book</td>
                  <td className="p-4 text-center bg-primary/5">
                    <span className="text-lg font-bold text-green-600">$49</span>
                  </td>
                  <td className="p-4 text-center bg-amber-50">
                    <span className="text-lg font-bold text-green-600">~$42/mo*</span>
                    <div className="text-xs text-gray-600">*amortized over 5 years</div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-lg font-bold text-red-500">$2,000 - $10,000+</span>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium">Time to complete manuscript</td>
                  <td className="p-4 text-center bg-primary/5">
                    <span className="font-semibold text-green-600">Minutes to hours</span>
                  </td>
                  <td className="p-4 text-center bg-amber-50">
                    <span className="font-semibold text-green-600">Minutes to hours</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="font-semibold text-red-500">6 - 18 months</span>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium">Books per month</td>
                  <td className="p-4 text-center bg-primary/5">
                    <span className="font-semibold">1</span>
                  </td>
                  <td className="p-4 text-center bg-amber-50">
                    <span className="font-semibold">5</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="font-semibold text-gray-600">~1 per year</span>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium">Professional editing</td>
                  <td className="p-4 text-center bg-primary/5">
                    <Check className="h-5 w-5 text-green-600 mx-auto" />
                    <span className="text-xs text-gray-600">AI-powered</span>
                  </td>
                  <td className="p-4 text-center bg-amber-50">
                    <Check className="h-5 w-5 text-green-600 mx-auto" />
                    <span className="text-xs text-gray-600">AI-powered</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-sm text-gray-600">$1,500 - $5,000 extra</span>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium">KDP-ready formatting</td>
                  <td className="p-4 text-center bg-primary/5">
                    <Check className="h-5 w-5 text-green-600 mx-auto" />
                    <span className="text-xs text-gray-600">Included</span>
                  </td>
                  <td className="p-4 text-center bg-amber-50">
                    <Check className="h-5 w-5 text-green-600 mx-auto" />
                    <span className="text-xs text-gray-600">Included</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-sm text-gray-600">$500 - $2,000 extra</span>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium">Marketing content</td>
                  <td className="p-4 text-center bg-primary/5">
                    <Check className="h-5 w-5 text-green-600 mx-auto" />
                    <span className="text-xs text-gray-600">AI-generated</span>
                  </td>
                  <td className="p-4 text-center bg-amber-50">
                    <Check className="h-5 w-5 text-green-600 mx-auto" />
                    <span className="text-xs text-gray-600">AI-generated</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-sm text-gray-600">$500 - $3,000 extra</span>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium">Character development</td>
                  <td className="p-4 text-center bg-primary/5">
                    <Check className="h-5 w-5 text-green-600 mx-auto" />
                    <span className="text-xs text-gray-600">AI workshop</span>
                  </td>
                  <td className="p-4 text-center bg-amber-50">
                    <Check className="h-5 w-5 text-green-600 mx-auto" />
                    <span className="text-xs text-gray-600">AI workshop</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-sm text-gray-600">Manual process</span>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium">Lifetime access</td>
                  <td className="p-4 text-center bg-primary/5">
                    <span className="text-sm text-gray-600">Monthly subscription</span>
                  </td>
                  <td className="p-4 text-center bg-amber-50">
                    <Check className="h-5 w-5 text-green-600 mx-auto" />
                    <span className="text-xs text-green-600 font-medium">One-time payment</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-sm text-gray-600">N/A</span>
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">Annual cost (1 book/mo)</td>
                  <td className="p-4 text-center bg-primary/5">
                    <span className="text-lg font-bold text-green-600">$588/year</span>
                  </td>
                  <td className="p-4 text-center bg-amber-50">
                    <span className="text-lg font-bold text-green-600">$0/year*</span>
                    <div className="text-xs text-gray-600">*after one-time payment</div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-lg font-bold text-red-500">$4,500 - $20,000+</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="mt-6 p-4 bg-white/80 rounded-lg text-center shadow-sm">
            <p className="text-sm text-gray-600">
              Traditional publishing costs include ghostwriting ($2,000-$10,000), professional editing ($1,500-$5,000), 
              formatting ($500-$2,000), and marketing ($500-$3,000). With AI KDP Author, everything is included in one plan.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-white">
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