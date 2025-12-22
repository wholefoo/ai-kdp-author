import { Link } from "wouter";
import { ArrowLeft, BookOpen, Headphones, Sparkles, PenTool, Download, Target, PlayCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Helmet } from "react-helmet-async";

export default function Tutorials() {
  const tutorials = [
    {
      icon: BookOpen,
      title: "Novel Generation Tutorials",
      description: "Step-by-step guides for creating your first novel",
      lessons: [
        { 
          name: "Quick Start: Your First Novel in 30 Minutes",
          duration: "30 min",
          level: "Beginner",
          link: "#first-novel"
        },
        { 
          name: "Advanced Genre Configuration",
          duration: "20 min",
          level: "Intermediate",
          link: "#genre-config"
        },
        { 
          name: "Customizing Word Count & Chapter Structure",
          duration: "15 min",
          level: "Beginner",
          link: "#word-count"
        },
        { 
          name: "Creating Multi-Genre Novels",
          duration: "25 min",
          level: "Advanced",
          link: "#multi-genre"
        },
        { 
          name: "Editing & Refining AI-Generated Content",
          duration: "35 min",
          level: "Intermediate",
          link: "#editing-content"
        }
      ]
    },
    {
      icon: Headphones,
      title: "Audiobook Creation Tutorials",
      description: "Learn to create professional audiobooks",
      lessons: [
        { 
          name: "Creating Your First Audiobook",
          duration: "20 min",
          level: "Beginner",
          link: "#first-audiobook"
        },
        { 
          name: "Voice Selection & Customization",
          duration: "15 min",
          level: "Beginner",
          link: "#voice-selection"
        },
        { 
          name: "Audio Format & Quality Optimization",
          duration: "25 min",
          level: "Intermediate",
          link: "#audio-quality"
        },
        { 
          name: "Publishing to Audible & ACX",
          duration: "30 min",
          level: "Advanced",
          link: "#audible-acx"
        }
      ]
    },
    {
      icon: Sparkles,
      title: "Manuscript Analysis Tutorials",
      description: "Master manuscript evaluation and improvement",
      lessons: [
        { 
          name: "Running Your First Quality Analysis",
          duration: "15 min",
          level: "Beginner",
          link: "#quality-analysis"
        },
        { 
          name: "Understanding Character Consistency Reports",
          duration: "20 min",
          level: "Intermediate",
          link: "#character-reports"
        },
        { 
          name: "Interpreting Narrative Arc Visualizations",
          duration: "25 min",
          level: "Intermediate",
          link: "#narrative-arc"
        },
        { 
          name: "Applying AI Improvement Suggestions",
          duration: "30 min",
          level: "Advanced",
          link: "#ai-suggestions"
        }
      ]
    },
    {
      icon: PenTool,
      title: "Character Development Tutorials",
      description: "Create compelling, consistent characters",
      lessons: [
        { 
          name: "Building Your First Character Profile",
          duration: "20 min",
          level: "Beginner",
          link: "#character-profile"
        },
        { 
          name: "Using AI Interview Mode Effectively",
          duration: "25 min",
          level: "Intermediate",
          link: "#interview-mode"
        },
        { 
          name: "Mapping Emotional Character Journeys",
          duration: "30 min",
          level: "Advanced",
          link: "#emotional-journey"
        },
        { 
          name: "Creating Character Relationship Networks",
          duration: "20 min",
          level: "Intermediate",
          link: "#relationship-networks"
        }
      ]
    },
    {
      icon: Target,
      title: "Plot Development Tutorials",
      description: "Develop engaging plots and story arcs",
      lessons: [
        { 
          name: "From Idea to Full Plot Outline",
          duration: "25 min",
          level: "Beginner",
          link: "#idea-to-plot"
        },
        { 
          name: "Using the Plot Inspiration Vault",
          duration: "15 min",
          level: "Beginner",
          link: "#plot-vault"
        },
        { 
          name: "AI-Powered Plot Expansion Techniques",
          duration: "30 min",
          level: "Intermediate",
          link: "#plot-expansion"
        },
        { 
          name: "Advanced Story Structure Frameworks",
          duration: "35 min",
          level: "Advanced",
          link: "#story-frameworks"
        }
      ]
    },
    {
      icon: Download,
      title: "Export & Publishing Tutorials",
      description: "Format and publish your novels professionally",
      lessons: [
        { 
          name: "Exporting for Amazon KDP",
          duration: "20 min",
          level: "Beginner",
          link: "#kdp-export"
        },
        { 
          name: "Using Formatting Presets",
          duration: "15 min",
          level: "Beginner",
          link: "#formatting-presets"
        },
        { 
          name: "Custom Formatting & Styling",
          duration: "25 min",
          level: "Intermediate",
          link: "#custom-formatting"
        },
        { 
          name: "Multi-Platform Publishing Strategy",
          duration: "40 min",
          level: "Advanced",
          link: "#multi-platform"
        },
        { 
          name: "Creating Print-Ready PDFs",
          duration: "30 min",
          level: "Intermediate",
          link: "#print-pdf"
        }
      ]
    }
  ];

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Beginner":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "Intermediate":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "Advanced":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <>
      <Helmet>
        <title>Tutorials - AI KDP Author | Step-by-Step Guides</title>
        <meta name="description" content="Comprehensive video tutorials and step-by-step guides for AI KDP Author. Learn novel generation, audiobook creation, manuscript analysis, character development, and publishing strategies." />
        <link rel="canonical" href="https://aikdpauthor.com/tutorials" />
        <meta property="og:title" content="Tutorials - AI KDP Author | Step-by-Step Guides" />
        <meta property="og:description" content="Master AI KDP Author with our comprehensive tutorial library. Step-by-step guides for all skill levels." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://aikdpauthor.com/tutorials" />
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
              <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent" data-testid="text-tutorials-title">
                Video Tutorials & Guides
              </h1>
              <p className="text-lg text-muted-foreground mb-4 italic" data-testid="text-coming-soon">
                (Coming Soon)
              </p>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto" data-testid="text-tutorials-subtitle">
                Step-by-step tutorials to help you master every feature of AI KDP Author
              </p>
            </div>

            {/* Tutorials Grid */}
            <section>
              <div className="grid lg:grid-cols-2 gap-8">
                {tutorials.map((category, index) => (
                  <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow" data-testid={`card-tutorial-category-${index}`}>
                    <CardHeader>
                      <div className="flex items-center space-x-4">
                        <div className="bg-primary/10 p-3 rounded-lg">
                          <category.icon className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-xl" data-testid={`text-category-title-${index}`}>{category.title}</CardTitle>
                          <CardDescription data-testid={`text-category-description-${index}`}>{category.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {category.lessons.map((lesson, idx) => (
                          <a 
                            key={idx}
                            href={lesson.link}
                            className="flex items-center justify-between p-3 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
                            data-testid={`link-tutorial-${index}-${idx}`}
                          >
                            <div className="flex items-center space-x-3 flex-1">
                              <PlayCircle className="h-5 w-5 text-primary flex-shrink-0 group-hover:scale-110 transition-transform" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-primary" data-testid={`text-lesson-name-${index}-${idx}`}>
                                  {lesson.name}
                                </p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className="text-xs text-gray-500 dark:text-gray-400" data-testid={`text-lesson-duration-${index}-${idx}`}>{lesson.duration}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded ${getLevelColor(lesson.level)}`} data-testid={`text-lesson-level-${index}-${idx}`}>
                                    {lesson.level}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Learning Path Section */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100 text-center" data-testid="text-learning-path-title">Recommended Learning Path</h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="bg-green-100 dark:bg-green-900 rounded-full p-2 flex-shrink-0">
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100" data-testid="text-path-step-1-title">1. Start with Novel Generation</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="text-path-step-1-description">Begin with "Your First Novel in 30 Minutes" to understand the basics</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-2 flex-shrink-0">
                    <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100" data-testid="text-path-step-2-title">2. Learn Character Development</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="text-path-step-2-description">Build compelling characters with the Character Development tutorials</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-purple-100 dark:bg-purple-900 rounded-full p-2 flex-shrink-0">
                    <CheckCircle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100" data-testid="text-path-step-3-title">3. Master Quality Analysis</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="text-path-step-3-description">Use Manuscript Analysis tools to refine your work</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-orange-100 dark:bg-orange-900 rounded-full p-2 flex-shrink-0">
                    <CheckCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100" data-testid="text-path-step-4-title">4. Publish Your Work</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="text-path-step-4-description">Learn formatting and publishing strategies for Amazon KDP</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Support Section */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100" data-testid="text-support-title">Need Personal Guidance?</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6" data-testid="text-support-description">
                Our team is available to provide personalized tutorial recommendations and assistance.
              </p>
              <Button 
                size="lg" 
                onClick={() => window.location.href = 'mailto:boundlessvolumes@gmail.com'}
                data-testid="button-contact-support"
              >
                Request Tutorial Support
              </Button>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
