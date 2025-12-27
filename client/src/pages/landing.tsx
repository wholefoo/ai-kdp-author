import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Zap, Download, Star, Users, Clock } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-primary text-white rounded-lg p-2">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">AI KDP Author</h1>
                <p className="text-slate-600 text-sm">Create complete books ready for Amazon KDP</p>
              </div>
            </div>
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="bg-primary hover:bg-primary/90 text-white"
              data-testid="button-login"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-5xl font-bold text-slate-900 mb-6">
            Generate Complete Books with AI
          </h2>
          <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
            Create professional, publishable fiction and non-fiction books of 50,000-80,000 words with advanced AI technology. 
            Perfect for Amazon KDP publishing with built-in formatting and quality assurance.
          </p>
          <Button 
            size="lg"
            onClick={() => window.location.href = '/api/login'}
            className="bg-primary hover:bg-primary/90 text-white text-lg px-8 py-3"
            data-testid="button-hero-login"
          >
            Start Writing Your Book
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h3 className="text-3xl font-bold text-center text-slate-900 mb-12">
            Everything You Need to Publish
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-blue-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <Zap className="h-8 w-8 text-blue-600 mb-2" />
                <CardTitle>AI-Powered Generation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Advanced AI creates compelling storylines, well-developed characters, and engaging dialogue 
                  tailored to your genre and preferences.
                </p>
              </CardContent>
            </Card>

            <Card className="border-green-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <Download className="h-8 w-8 text-green-600 mb-2" />
                <CardTitle>KDP-Ready Export</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Export your completed manuscript in multiple formats (DOCX, PDF, TXT) with proper formatting 
                  for immediate Amazon KDP upload.
                </p>
              </CardContent>
            </Card>

            <Card className="border-purple-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <Star className="h-8 w-8 text-purple-600 mb-2" />
                <CardTitle>Quality Assurance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Built-in consistency checker analyzes style, tone, pacing, and characterization 
                  to ensure professional-quality manuscripts.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="flex items-center justify-center mb-4">
                <BookOpen className="h-8 w-8 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-2">50K-80K</div>
              <div className="text-slate-600">Words Generated</div>
            </div>
            <div>
              <div className="flex items-center justify-center mb-4">
                <Clock className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-2">20-30</div>
              <div className="text-slate-600">Chapters Created</div>
            </div>
            <div>
              <div className="flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-2">100%</div>
              <div className="text-slate-600">KDP Compatible</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold mb-6">Ready to Write Your Book?</h3>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of authors who have published their AI-generated books on Amazon KDP
          </p>
          <Button 
            size="lg"
            onClick={() => window.location.href = '/api/login'}
            className="bg-white text-primary hover:bg-gray-100 text-lg px-8 py-3"
            data-testid="button-cta-login"
          >
            Start Your Book Today
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-center items-center gap-4 mb-4">
            <a href="/privacy" className="text-slate-400 hover:text-white transition-colors text-sm" data-testid="link-footer-privacy">
              Privacy Policy
            </a>
            <span className="text-slate-600 hidden md:inline">•</span>
            <a href="/terms" className="text-slate-400 hover:text-white transition-colors text-sm" data-testid="link-footer-terms">
              Terms of Use
            </a>
            <span className="text-slate-600 hidden md:inline">•</span>
            <a href="/about" className="text-slate-400 hover:text-white transition-colors text-sm" data-testid="link-footer-about">
              About
            </a>
          </div>
          <p className="text-slate-400 text-center">
            © 2025 AI KDP Author. Create. Publish. Succeed.
          </p>
        </div>
      </footer>
    </div>
  );
}