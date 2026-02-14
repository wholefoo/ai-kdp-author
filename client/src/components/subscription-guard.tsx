import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Lock, BookOpen, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface SubscriptionGuardProps {
  children: React.ReactNode;
  feature: string;
  requiresPro?: boolean;
}

export default function SubscriptionGuard({ children, feature, requiresPro = true }: SubscriptionGuardProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && user) {
      apiRequest("/api/subscription/status", "GET")
        .then((data) => {
          setSubscriptionStatus(data);
          setHasError(false);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error("Error checking subscription:", error);
          setHasError(true);
          setSubscriptionStatus(null);
          setIsLoading(false);
        });
    } else if (!authLoading && !user) {
      setIsLoading(false);
    }
  }, [authLoading, user]);

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle>Login Required</CardTitle>
            <CardDescription>
              Please log in to access {feature}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={() => window.location.href = '/api/login'} 
              data-testid="button-login"
            >
              Login to Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin users have access to all features regardless of subscription status or errors
  if (subscriptionStatus?.isAdmin) {
    return <>{children}</>;
  }

  // Block access if:
  // 1. Feature requires Pro AND
  // 2. Either failed to fetch status OR user doesn't have active subscription
  const shouldBlock = requiresPro && (hasError || !subscriptionStatus?.hasActiveSubscription);
  
  if (shouldBlock) {
    return (
      <div className="p-6">
        <Card className="w-full max-w-4xl mx-auto border-2 border-primary/20">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Crown className="h-12 w-12 text-primary mr-3" />
              <Badge variant="outline" className="border-primary text-primary px-4 py-2">
                Pro Feature
              </Badge>
            </div>
            <CardTitle className="text-2xl">Upgrade to AI KDP Author Pro</CardTitle>
            <CardDescription className="text-lg">
              {feature} is available with a Pro subscription
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
                <BookOpen className="h-6 w-6 text-blue-600" />
                <div>
                  <h4 className="font-medium text-blue-800">Complete Novels</h4>
                  <p className="text-sm text-blue-600">50K-80K words</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg">
                <Sparkles className="h-6 w-6 text-purple-600" />
                <div>
                  <h4 className="font-medium text-purple-800">Publishing Tools</h4>
                  <p className="text-sm text-purple-600">KDP-ready formats</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                <Sparkles className="h-6 w-6 text-green-600" />
                <div>
                  <h4 className="font-medium text-green-800">AI Analysis</h4>
                  <p className="text-sm text-green-600">Advanced tools</p>
                </div>
              </div>
            </div>
            
            <div className="text-center space-y-4">
              <div className="bg-gradient-to-r from-primary/10 to-purple-600/10 p-6 rounded-lg">
                <h3 className="text-xl font-bold mb-2">$49/month</h3>
                <p className="text-muted-foreground mb-4">
                  Everything you need to publish professional novels on Amazon KDP
                </p>
                <div className="flex flex-wrap justify-center gap-2 text-sm">
                  <Badge variant="secondary">30-day guarantee</Badge>
                  <Badge variant="secondary">Cancel anytime</Badge>
                  <Badge variant="secondary">Unlimited novels</Badge>
                </div>
              </div>
              
              <div className="flex gap-4 justify-center">
                <Button 
                  onClick={() => window.location.href = '/subscribe'} 
                  size="lg"
                  data-testid="button-upgrade"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Pro
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setLocation('/')}
                  data-testid="button-back"
                >
                  Go Back
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User has active subscription or feature doesn't require pro
  return <>{children}</>;
}