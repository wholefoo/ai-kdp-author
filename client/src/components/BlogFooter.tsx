import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowRight, Sparkles } from "lucide-react";

export default function BlogFooter() {
  return (
    <div className="mt-16 border-t border-border">
      <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-background py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            
            <h3 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Ready to Write Your Novel?
            </h3>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join thousands of authors using AI KDP Author to create professional, 
              publishable novels in days, not months. Start your journey today with 
              our powerful AI-driven novel generation platform.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <a href="/subscribe">
                <Button size="lg" className="gap-2 group" data-testid="button-subscribe-footer">
                  <BookOpen className="w-5 h-5" />
                  Start Writing Now
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </a>
              
              <Link href="/home">
                <Button variant="outline" size="lg" data-testid="button-learn-more-footer">
                  Learn More
                </Button>
              </Link>
            </div>
            
            <p className="text-sm text-muted-foreground pt-4">
              No credit card required • Start with our free trial • Cancel anytime
            </p>
          </div>
        </div>
      </div>
      
      <div className="bg-muted/30 py-6">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>&copy; 2025 AI KDP Author. All rights reserved.</p>
            
            <div className="flex gap-6">
              <a href="/privacy" className="hover:text-foreground transition-colors" data-testid="link-privacy-footer">
                Privacy Policy
              </a>
              <a href="/terms" className="hover:text-foreground transition-colors" data-testid="link-terms-footer">
                Terms of Use
              </a>
              <a href="/about" className="hover:text-foreground transition-colors" data-testid="link-about-footer">
                About
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
