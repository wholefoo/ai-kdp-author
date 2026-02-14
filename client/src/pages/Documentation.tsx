import { Link } from "wouter";
import { ArrowLeft, BookOpen, Sparkles, PenTool, Download, Target, BarChart3, FileText, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Helmet } from "react-helmet-async";

export default function Documentation() {
  const featureDocs = [
    {
      icon: BookOpen,
      title: "Book Generation",
      description: "Complete guide to AI-powered fiction and non-fiction creation",
      topics: [
        { name: "Fiction: Outline Creation & Story Structure", link: "/docs/outline-creation" },
        { name: "Non-Fiction: Research & Source Verification", link: "/docs/non-fiction-research" },
        { name: "AI Model & Customization Options", link: "/docs/ai-customization" },
        { name: "Chapter-by-Chapter Generation Process", link: "/docs/chapter-generation" }
      ]
    },
    {
      icon: PenTool,
      title: "Character Development",
      description: "Tools for creating compelling, consistent characters",
      topics: [
        { name: "Interview Mode: Deep Character Building", link: "/docs/interview-mode" },
        { name: "Emotional Journey Mapping", link: "/docs/emotional-journey" },
        { name: "Character Growth & Arc Suggestions", link: "/docs/character-growth" }
      ]
    },
    {
      icon: Sparkles,
      title: "Manuscript Analysis",
      description: "Advanced AI-powered manuscript evaluation tools",
      topics: [
        { name: "Advanced Grammar & Style Checker", link: "/docs/grammar-checker" },
        { name: "Style & Tone Consistency Analysis", link: "/docs/style-consistency" },
        { name: "Comprehensive Quality Reports", link: "/docs/quality-reports" }
      ]
    },
    {
      icon: Download,
      title: "Export & Publishing",
      description: "Format and export your books for publishing",
      topics: [
        { name: "DOCX & PDF Formatting Options", link: "/docs/docx-pdf-formatting" },
        { name: "Non-Fiction Bibliography Formatting", link: "/docs/bibliography-formatting" },
        { name: "KDP-Ready File Preparation", link: "/docs/kdp-preparation" },
        { name: "Cover Design Guidelines", link: "/docs/cover-design" }
      ]
    }
  ];

  return (
    <>
      <Helmet>
        <title>Feature Documentation - AI KDP Author | Technical Reference</title>
        <meta name="description" content="Comprehensive technical documentation for all AI KDP Author features. Learn about fiction and non-fiction book generation, manuscript analysis, character development, and publishing tools." />
        <link rel="canonical" href="https://aikdpauthor.com/documentation" />
        <meta property="og:title" content="Feature Documentation - AI KDP Author | Technical Reference" />
        <meta property="og:description" content="Complete technical reference for AI KDP Author's fiction and non-fiction book generation, analysis, and publishing features." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://aikdpauthor.com/documentation" />
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
              <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent" data-testid="text-documentation-title">
                Feature Documentation
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto" data-testid="text-documentation-subtitle">
                Detailed technical documentation for every feature in AI KDP Author
              </p>
            </div>

            {/* Documentation Grid */}
            <section>
              <div className="grid lg:grid-cols-2 gap-8">
                {featureDocs.map((feature, index) => (
                  <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow" data-testid={`card-feature-doc-${index}`}>
                    <CardHeader>
                      <div className="flex items-center space-x-4">
                        <div className="bg-primary/10 p-3 rounded-lg">
                          <feature.icon className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-xl" data-testid={`text-feature-title-${index}`}>{feature.title}</CardTitle>
                          <CardDescription data-testid={`text-feature-description-${index}`}>{feature.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {feature.topics.map((topic, idx) => (
                          <a 
                            key={idx}
                            href={topic.link}
                            className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400 hover:underline p-2 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            data-testid={`link-topic-${index}-${idx}`}
                          >
                            <FileText className="h-4 w-4 flex-shrink-0" />
                            <span>{topic.name}</span>
                          </a>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Support Section */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100" data-testid="text-support-title">Need Technical Support?</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6" data-testid="text-support-description">
                Can't find the documentation you need? Our technical support team is here to help.
              </p>
              <Button 
                size="lg" 
                onClick={() => window.location.href = 'mailto:boundlessvolumes@gmail.com'}
                data-testid="button-contact-support"
              >
                Contact Technical Support
              </Button>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
