import { Link } from "wouter";
import { ArrowLeft, BookOpen, Headphones, Sparkles, PenTool, Download, Target, BarChart3, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Helmet } from "react-helmet-async";

export default function Docs() {
  const gettingStarted = [
    {
      title: "1. Create Your Account",
      description: "Sign up with your email or use Replit authentication to get started instantly.",
      steps: [
        "Click 'Get Started' or 'Login' on the homepage",
        "Complete the authentication process",
        "Choose your subscription plan (Basic, Pro, Premium, or Founders)"
      ]
    },
    {
      title: "2. Generate Your First Book",
      description: "Create a complete, publishable fiction or non-fiction book in minutes with AI assistance.",
      steps: [
        "Navigate to the 'Create' hub from your dashboard",
        "Choose Fiction or Non-Fiction content type",
        "Enter your book details (genre/category, title, plot idea or topic)",
        "Customize word count (30K-120K) and chapter count (10-50)",
        "Click 'Generate' and wait for AI to create your manuscript",
        "Review and edit the generated content"
      ]
    },
    {
      title: "3. Export and Publish",
      description: "Download your book in professional formats ready for publishing.",
      steps: [
        "Go to the 'Publish' hub",
        "Select your book from the library",
        "Choose export format (DOCX, PDF, TXT, or Markdown)",
        "Select formatting preset (KDP, CreateSpace, eBook, or Manuscript)",
        "Non-fiction books include automatic bibliography formatting",
        "Download and publish to Amazon KDP or other platforms"
      ]
    }
  ];

  const features = [
    {
      icon: BookOpen,
      title: "Book Generation",
      description: "Generate complete 50,000-80,000 word fiction and non-fiction books with AI.",
      guides: [
        "Choose Fiction or Non-Fiction content type",
        "Fiction: Choose from genres (Romance, Thriller, Fantasy, Sci-Fi, etc.)",
        "Non-Fiction: Select from 17 categories (Business, History, Science, Self-Help, etc.)",
        "Customize word count between 30,000-120,000 words",
        "Set chapter count from 10-50 chapters",
        "Non-fiction includes automatic source verification and bibliography",
        "Review and edit AI-generated outlines before full generation"
      ]
    },
    {
      icon: Headphones,
      title: "Audiobook Creation",
      description: "Transform your books into professional audiobooks.",
      guides: [
        "Select a completed book from your library",
        "Choose from 80+ premium AI voices (Gemini TTS, Deepgram, OpenAI)",
        "Adjust narration speed (25%-400%)",
        "Select audio format (MP3, Opus, AAC, FLAC)",
        "Generate chapter-by-chapter or complete audiobook",
        "Download with metadata and chapter markers"
      ]
    },
    {
      icon: Sparkles,
      title: "Manuscript Analysis",
      description: "Get comprehensive quality analysis and improvement suggestions.",
      guides: [
        "Upload existing DOCX manuscripts for analysis",
        "Run character consistency checker",
        "Visualize narrative arc and emotional journey",
        "Check style and tone consistency",
        "Get grammar and readability scores",
        "Receive actionable improvement suggestions"
      ]
    },
    {
      icon: PenTool,
      title: "Character Development",
      description: "Create compelling, consistent characters with AI assistance.",
      guides: [
        "Create detailed character profiles in the Character Workshop",
        "Use AI Interview Mode to develop backstories",
        "Map emotional journeys for character growth",
        "Analyze character consistency across your novel",
        "Generate character development suggestions",
        "Export character guides for reference"
      ]
    },
    {
      icon: Target,
      title: "Plot Inspiration Vault",
      description: "Manage and develop your story ideas.",
      guides: [
        "Save plot ideas and story concepts",
        "Use AI to expand basic ideas into full plots",
        "Organize ideas by genre and theme",
        "Track which ideas have been developed into novels",
        "Get AI-powered plot suggestions",
        "Export ideas for external use"
      ]
    },
    {
      icon: Download,
      title: "Export Formats",
      description: "Download in multiple professional formats.",
      guides: [
        "DOCX: Amazon KDP-ready with customizable fonts (Aptos, Times New Roman)",
        "PDF: Professional submission format with custom margins",
        "Markdown: Plain text with formatting for editors",
        "TXT: Simple text format for any platform",
        "Use formatting presets: KDP, CreateSpace, eBook, Manuscript",
        "Customize fonts, margins, and line spacing"
      ]
    }
  ];

  const faqs = [
    {
      question: "How long does it take to generate a book?",
      answer: "Book generation typically takes 15-30 minutes depending on the word count and complexity. You'll receive email notifications when your book is ready."
    },
    {
      question: "Can I edit the AI-generated content?",
      answer: "Yes! All generated content is fully editable. You can revise chapters, adjust the outline, and make any changes before exporting."
    },
    {
      question: "What file formats are supported for export?",
      answer: "You can export in DOCX (Microsoft Word), PDF, Markdown (.md), and plain text (.txt). DOCX files use the Aptos font by default and include Amazon KDP-ready formatting."
    },
    {
      question: "How many books can I generate per month?",
      answer: "It depends on your subscription tier: Basic (5 books), Pro (20 books), Premium (50 books), and Founders (100 books). Both fiction and non-fiction count toward your limit. Trial users can only access the Refine features."
    },
    {
      question: "Can I upload my own manuscript for analysis?",
      answer: "Yes! You can upload existing DOCX manuscripts to use our analysis tools, including character consistency checking, style analysis, and quality scoring."
    },
    {
      question: "Are the audiobooks royalty-free?",
      answer: "All content generated through AI KDP Author is yours to use commercially. You can publish audiobooks on Audible, ACX, or any other platform."
    },
    {
      question: "What AI model powers the book generation?",
      answer: "We primarily use OpenAI GPT-5.2 for fiction and non-fiction generation, character development, and analysis. For audiobooks, we support 80+ voices from Gemini TTS, Deepgram Aura-2, and OpenAI."
    },
    {
      question: "Can I cancel my subscription anytime?",
      answer: "Yes, you can cancel your subscription at any time. You'll retain access until the end of your current billing period, and all your generated content remains accessible."
    }
  ];

  return (
    <>
      <Helmet>
        <title>Documentation - AI KDP Author | Complete User Guide</title>
        <meta name="description" content="Complete documentation for AI KDP Author. Learn how to generate fiction and non-fiction books, create audiobooks, analyze manuscripts, and publish to Amazon KDP with our comprehensive guides and tutorials." />
        <link rel="canonical" href="https://aikdpauthor.com/docs" />
        <meta property="og:title" content="Documentation - AI KDP Author | Complete User Guide" />
        <meta property="og:description" content="Master AI KDP Author with our complete documentation. Step-by-step guides for fiction and non-fiction book generation, audiobook creation, and Amazon KDP publishing." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://aikdpauthor.com/docs" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <Link href="/">
            <Button variant="ghost" className="mb-8" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>

          <div className="space-y-16">
            {/* Header */}
            <div className="text-center">
              <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent" data-testid="text-docs-title">
                Documentation
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                Everything you need to know about creating, analyzing, and publishing fiction and non-fiction books with AI KDP Author
              </p>
            </div>

            {/* Getting Started */}
            <section>
              <h2 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">Getting Started</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {gettingStarted.map((step, index) => (
                  <Card key={index} className="border-0 shadow-lg" data-testid={`card-getting-started-${index}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span>{step.title}</span>
                      </CardTitle>
                      <CardDescription>{step.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {step.steps.map((item, idx) => (
                          <li key={idx} className="flex items-start space-x-2 text-sm text-gray-600 dark:text-gray-400">
                            <span className="text-primary">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Feature Guides */}
            <section>
              <h2 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">Feature Guides</h2>
              <div className="grid lg:grid-cols-2 gap-8">
                {features.map((feature, index) => (
                  <Card key={index} className="border-0 shadow-lg" data-testid={`card-feature-${index}`}>
                    <CardHeader>
                      <div className="flex items-center space-x-4">
                        <div className="bg-primary/10 p-3 rounded-lg">
                          <feature.icon className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">{feature.title}</CardTitle>
                          <CardDescription>{feature.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {feature.guides.map((guide, idx) => (
                          <li key={idx} className="flex items-start space-x-2 text-sm text-gray-600 dark:text-gray-400">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span>{guide}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* FAQs */}
            <section>
              <h2 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">Frequently Asked Questions</h2>
              <div className="space-y-6">
                {faqs.map((faq, index) => (
                  <Card key={index} className="border-0 shadow-lg" data-testid={`card-faq-${index}`}>
                    <CardHeader>
                      <CardTitle className="text-lg">{faq.question}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 dark:text-gray-400">{faq.answer}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Support Section */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Need More Help?</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Can't find what you're looking for? Contact our support team for assistance.
              </p>
              <Button 
                size="lg" 
                onClick={() => window.location.href = 'mailto:boundlessvolumes@gmail.com'}
                data-testid="button-contact-support"
              >
                Contact Support
              </Button>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
