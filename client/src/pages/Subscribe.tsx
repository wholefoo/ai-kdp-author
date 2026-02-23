import { useEffect, useState } from 'react';
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, BookOpen, Sparkles, Star, Infinity, Heart, Users, Rocket } from "lucide-react";
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
    id: 'pro',
    name: 'Pro',
    price: 49,
    novelLimit: 1,
    description: 'Everything you need to create and publish',
    icon: Star,
    popular: true,
    features: [
      '1 book per month (fiction & non-fiction)',
      'Complete 50K-80K word manuscripts',
      'Amazon KDP-ready formatting',
      'Character development tools',
      'Quality analysis tools',
      'Professional exports (DOCX, PDF)',
      'Priority AI processing',
      'Advanced style customization',
      'Batch manuscript processing',
      'Priority support'
    ]
  },
  {
    id: 'founders',
    name: 'Founders',
    price: 2500,
    novelLimit: 5,
    description: 'Support platform development • Lifetime access',
    icon: Rocket,
    features: [
      '🎯 Limited to 100 members',
      '💫 Lifetime access (one-time payment)',
      '5 books per month (fiction & non-fiction)',
      'Everything in Pro',
      'AI cover creation (coming soon)',
      'Automated KDP publishing (coming soon)',
      'White-label licensing',
      'Custom AI model training',
      'Dedicated account manager',
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
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
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

        {/* Value Proposition Comparison Chart */}
        <div className="mt-20 max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-4">Why AI KDP Author?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See how our plans compare to the traditional cost of writing and publishing a book
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-4 border-b-2 border-primary/20 font-semibold text-lg"></th>
                  <th className="text-center p-4 border-b-2 border-primary bg-primary/5 font-semibold text-lg">
                    <div className="flex flex-col items-center gap-1">
                      <Star className="h-6 w-6 text-primary" />
                      <span>Pro</span>
                      <span className="text-sm font-normal text-muted-foreground">$49/month</span>
                    </div>
                  </th>
                  <th className="text-center p-4 border-b-2 border-amber-400 bg-amber-50 font-semibold text-lg">
                    <div className="flex flex-col items-center gap-1">
                      <Rocket className="h-6 w-6 text-amber-500" />
                      <span>Founders</span>
                      <span className="text-sm font-normal text-muted-foreground">$2,500 one-time</span>
                    </div>
                  </th>
                  <th className="text-center p-4 border-b-2 border-gray-300 font-semibold text-lg">
                    <div className="flex flex-col items-center gap-1">
                      <BookOpen className="h-6 w-6 text-gray-500" />
                      <span>Traditional</span>
                      <span className="text-sm font-normal text-muted-foreground">Industry Average</span>
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
                    <div className="text-xs text-muted-foreground">*amortized over 5 years</div>
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
                    <span className="font-semibold text-muted-foreground">~1 per year</span>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium">Professional editing</td>
                  <td className="p-4 text-center bg-primary/5">
                    <Check className="h-5 w-5 text-green-600 mx-auto" />
                    <span className="text-xs text-muted-foreground">AI-powered</span>
                  </td>
                  <td className="p-4 text-center bg-amber-50">
                    <Check className="h-5 w-5 text-green-600 mx-auto" />
                    <span className="text-xs text-muted-foreground">AI-powered</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-sm text-muted-foreground">$1,500 - $5,000 extra</span>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium">KDP-ready formatting</td>
                  <td className="p-4 text-center bg-primary/5">
                    <Check className="h-5 w-5 text-green-600 mx-auto" />
                    <span className="text-xs text-muted-foreground">Included</span>
                  </td>
                  <td className="p-4 text-center bg-amber-50">
                    <Check className="h-5 w-5 text-green-600 mx-auto" />
                    <span className="text-xs text-muted-foreground">Included</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-sm text-muted-foreground">$500 - $2,000 extra</span>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium">Marketing content</td>
                  <td className="p-4 text-center bg-primary/5">
                    <Check className="h-5 w-5 text-green-600 mx-auto" />
                    <span className="text-xs text-muted-foreground">AI-generated</span>
                  </td>
                  <td className="p-4 text-center bg-amber-50">
                    <Check className="h-5 w-5 text-green-600 mx-auto" />
                    <span className="text-xs text-muted-foreground">AI-generated</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-sm text-muted-foreground">$500 - $3,000 extra</span>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium">Character development</td>
                  <td className="p-4 text-center bg-primary/5">
                    <Check className="h-5 w-5 text-green-600 mx-auto" />
                    <span className="text-xs text-muted-foreground">AI workshop</span>
                  </td>
                  <td className="p-4 text-center bg-amber-50">
                    <Check className="h-5 w-5 text-green-600 mx-auto" />
                    <span className="text-xs text-muted-foreground">AI workshop</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-sm text-muted-foreground">Manual process</span>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium">Lifetime access</td>
                  <td className="p-4 text-center bg-primary/5">
                    <span className="text-sm text-muted-foreground">Monthly subscription</span>
                  </td>
                  <td className="p-4 text-center bg-amber-50">
                    <Check className="h-5 w-5 text-green-600 mx-auto" />
                    <span className="text-xs text-green-600 font-medium">One-time payment</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-sm text-muted-foreground">N/A</span>
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">Annual cost (1 book/mo)</td>
                  <td className="p-4 text-center bg-primary/5">
                    <span className="text-lg font-bold text-green-600">$588/year</span>
                  </td>
                  <td className="p-4 text-center bg-amber-50">
                    <span className="text-lg font-bold text-green-600">$0/year*</span>
                    <div className="text-xs text-muted-foreground">*after one-time payment</div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-lg font-bold text-red-500">$4,500 - $20,000+</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="mt-6 p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              Traditional publishing costs include ghostwriting ($2,000-$10,000), professional editing ($1,500-$5,000), 
              formatting ($500-$2,000), and marketing ($500-$3,000). With AI KDP Author, everything is included in one plan.
            </p>
          </div>
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