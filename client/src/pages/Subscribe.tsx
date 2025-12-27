import { useEffect, useState } from 'react';
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, BookOpen, Headphones, Sparkles, Star, Infinity, Heart, Users, Rocket } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

type SubscriptionTier = {
  id: string;
  name: string;
  price: number;
  novelLimit: number;
  features: string[];
  icon: any;
  popular?: boolean;
  description: string;
};

const subscriptionTiers: SubscriptionTier[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 29,
    novelLimit: 5,
    description: 'Perfect for occasional writers',
    icon: BookOpen,
    features: [
      '5 books per month (fiction & non-fiction)',
      'Complete 50K-80K word manuscripts',
      'Amazon KDP-ready formatting',
      'Character development tools',
      'Quality analysis tools',
      'Professional exports (DOCX, PDF)',
      'Email support'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 49,
    novelLimit: 20,
    description: 'Ideal for serious authors',
    icon: Star,
    popular: true,
    features: [
      '20 books per month (fiction & non-fiction)',
      'Everything in Basic',
      'Advanced audiobook generation',
      'Priority AI processing',
      'Advanced style customization',
      'Batch manuscript processing',
      'Priority support'
    ]
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 99,
    novelLimit: 50,
    description: 'For professional publishers',
    icon: Crown,
    features: [
      '50 books per month (fiction & non-fiction)',
      'Everything in Pro',
      'AI cover creation (coming soon)',
      'Automated KDP publishing (coming soon)',
      'White-label licensing',
      'Custom AI model training',
      'Dedicated account manager'
    ]
  },
  {
    id: 'founders',
    name: 'Founders',
    price: 2500,
    novelLimit: 100,
    description: 'Support platform development • Lifetime access',
    icon: Rocket,
    features: [
      '🎯 Limited to 100 members',
      '💫 Lifetime access (one-time payment)',
      '100 books per month (fiction & non-fiction)',
      'Everything in Pro',
      'Early access to new features',
      'Direct feedback channel',
      'Founders badge & recognition',
      'Listed on Founding Members page',
      'Support indie development'
    ]
  }
];

const SubscribeForm = ({ tier, clientSecret, billingPeriod }: { tier: SubscriptionTier; clientSecret: string; billingPeriod: 'monthly' | 'annual' }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!stripe || !elements) {
      setIsLoading(false);
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/?subscription=success&tier=${tier.id}`,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: `Welcome to AI KDP Author ${tier.name}! You now have access to all ${tier.name} features.`,
      });
    }
    setIsLoading(false);
  };

  const isAnnual = billingPeriod === 'annual';
  const displayPrice = isAnnual ? tier.price * 10 : tier.price;
  const priceSuffix = isAnnual ? '/year' : '/month';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || isLoading} 
        className="w-full"
        data-testid="button-subscribe"
      >
        {isLoading ? "Processing..." : `Subscribe to ${tier.name} - $${displayPrice}${priceSuffix}`}
      </Button>
    </form>
  );
};

export default function Subscribe() {
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [clientSecret, setClientSecret] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [foundersAvailability, setFoundersAvailability] = useState<any>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && user) {
      // Check subscription status
      apiRequest("/api/subscription/status", "GET")
        .then((data) => {
          setSubscriptionStatus(data);
        })
        .catch((error) => {
          console.error("Subscription status error:", error);
        });
    }
    
    // Fetch Founders availability (public endpoint)
    apiRequest("/api/founders/availability", "GET")
      .then((data) => {
        setFoundersAvailability(data);
      })
      .catch((error) => {
        console.error("Founders availability error:", error);
      });
  }, [authLoading, user]);

  const handleSelectTier = async (tier: SubscriptionTier) => {
    setIsLoading(true);
    setSelectedTier(tier);
    setSelectedBillingPeriod(billingPeriod); // Store the selected billing period
    
    try {
      // Founders tier uses Stripe Checkout (one-time payment)
      if (tier.id === 'founders') {
        // Check if Founders is sold out before proceeding
        if (foundersAvailability && !foundersAvailability.available) {
          toast({
            title: "Sold Out",
            description: "Founders tier is no longer available. All 100 slots have been claimed.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        
        const data = await apiRequest("/api/create-founders-checkout", "POST", {});
        
        if (data?.url) {
          // Redirect to Stripe Checkout (loading will remain true during redirect)
          window.location.href = data.url;
        } else {
          setIsLoading(false);
        }
      } else {
        // Other tiers use subscription flow with Payment Element
        const data = await apiRequest("/api/create-subscription", "POST", {
          tierId: tier.id,
          priceId: `price_${tier.id}`,
          billingPeriod: billingPeriod // Pass billing period to backend
        });
        
        if (data?.clientSecret) {
          setClientSecret(data.clientSecret);
          setIsLoading(false);
        } else {
          setIsLoading(false);
        }
      }
    } catch (error: any) {
      console.error("Subscription creation error:", error);
      setHasError(true);
      toast({
        title: "Error",
        description: error?.message || "Failed to initialize subscription. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Crown className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle>Login Required</CardTitle>
            <CardDescription>
              Please log in to subscribe to AI KDP Author Pro
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = '/api/login'} 
              className="w-full"
              data-testid="button-login"
            >
              Login to Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (subscriptionStatus?.hasActiveSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Crown className="h-12 w-12 text-primary mr-3" />
              <Badge variant="secondary" className="bg-green-100 text-green-800 px-4 py-2">
                Active Subscriber
              </Badge>
            </div>
            <CardTitle className="text-2xl">You're Already Subscribed!</CardTitle>
            <CardDescription className="text-lg">
              You have access to all features in your current plan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center pt-4">
              <Button onClick={() => window.location.href = '/'} data-testid="button-continue">
                Continue to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If there's a selected tier and client secret, show payment form
  if (selectedTier && clientSecret) {
    const isAnnual = selectedBillingPeriod === 'annual';
    const displayPrice = isAnnual ? selectedTier.price * 10 : selectedTier.price;
    const priceSuffix = isAnnual ? '/year' : '/month';
    
    return (
      <div className="min-h-screen py-12 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Complete Your Subscription</h1>
            <p className="text-muted-foreground">
              You've selected the {selectedTier.name} plan at ${displayPrice}{priceSuffix}
            </p>
            {isAnnual && (
              <p className="text-sm text-green-600 mt-2">
                ${selectedTier.price}/month • Save 2 months with annual billing
              </p>
            )}
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Payment Details</CardTitle>
              <CardDescription className="text-center">
                Secure payment powered by Stripe
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <SubscribeForm tier={selectedTier} clientSecret={clientSecret} billingPeriod={selectedBillingPeriod} />
              </Elements>
              
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>30-day money-back guarantee</span>
                </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground mt-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>Cancel anytime, no questions asked</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show loading state while processing tier selection
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="text-center space-y-4 pt-6">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-muted-foreground">Setting up your subscription...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="text-center space-y-4 pt-6">
            <div className="text-red-500 mb-4">
              <Crown className="h-12 w-12 mx-auto mb-2" />
              <h3 className="text-lg font-semibold">Subscription Setup Failed</h3>
              <p className="text-sm text-muted-foreground">There was an issue setting up your subscription. Please try again or contact support.</p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button 
                onClick={() => { setHasError(false); setSelectedTier(null); }}
                data-testid="button-retry"
              >
                Try Again
              </Button>
              <Button 
                variant="outline"
                onClick={() => setLocation('/')}
                data-testid="button-back"
              >
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main pricing tiers display
  return (
    <div className="min-h-screen py-12 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <Crown className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-5xl font-bold mb-6">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Professional AI novel generation and publishing tools. Start with our 30-day free trial that includes manuscript analysis, then upgrade to unlock novel creation and publishing features.
          </p>
          
          {/* Billing Period Toggle */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className={`text-sm font-medium ${billingPeriod === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                billingPeriod === 'annual' ? 'bg-primary' : 'bg-gray-300'
              }`}
              data-testid="toggle-billing-period"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingPeriod === 'annual' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${billingPeriod === 'annual' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Annual
            </span>
            <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
              Save 17%
            </Badge>
          </div>
        </div>

        {/* Pricing Tiers */}
        <div className="grid md:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {subscriptionTiers.map((tier) => {
            const IconComponent = tier.icon;
            const isFounders = tier.id === 'founders';
            const isTrial = tier.id === 'trial';
            const foundersSoldOut = isFounders && foundersAvailability && !foundersAvailability.available;
            
            // Calculate display price based on billing period
            const displayPrice = (isFounders || isTrial) 
              ? tier.price 
              : billingPeriod === 'annual' ? tier.price * 10 : tier.price;
            
            // Determine price suffix
            let priceSuffix = '/month';
            if (isFounders) {
              priceSuffix = ' one-time';
            } else if (isTrial) {
              priceSuffix = '';
            } else if (billingPeriod === 'annual') {
              priceSuffix = '/year';
            }
            
            return (
              <Card key={tier.id} className={`relative ${tier.popular ? 'border-primary shadow-lg scale-105' : ''} ${isFounders ? 'border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50' : ''}`}>
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}
                {isFounders && foundersAvailability && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-amber-500 text-white px-4 py-1" data-testid="badge-founders-slots">
                      {foundersSoldOut ? 'SOLD OUT' : `${foundersAvailability.remaining} of ${foundersAvailability.total} Remaining`}
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-8">
                  <IconComponent className="h-12 w-12 text-primary mx-auto mb-4" />
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <CardDescription className="text-base">{tier.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold" data-testid={`price-${tier.id}`}>${displayPrice}</span>
                    <span className="text-muted-foreground">{priceSuffix}</span>
                  </div>
                  {billingPeriod === 'annual' && !isFounders && !isTrial && (
                    <div className="text-sm text-green-600 mt-1">
                      ${tier.price}/month • 2 months free
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground mt-2">
                    {tier.novelLimit === -1 ? 'Unlimited novels' : `${tier.novelLimit} novels per month`}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="pt-6">
                    <Button 
                      className="w-full" 
                      variant={tier.popular ? "default" : "outline"}
                      onClick={() => handleSelectTier(tier)}
                      disabled={foundersSoldOut}
                      data-testid={`button-select-${tier.id}`}
                    >
                      {foundersSoldOut ? 'Sold Out' : `Choose ${tier.name}`}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center mt-16 space-y-4">
          <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-green-600" />
              <span>30-day money-back guarantee</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-green-600" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-green-600" />
              <span>Secure payments by Stripe</span>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            All plans include Amazon KDP-ready formatting, professional-grade AI generation, and our complete suite of novel creation and publishing tools.
          </p>
        </div>
      </div>
    </div>
  );
}