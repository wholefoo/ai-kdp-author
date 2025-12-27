import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, TrendingUp, DollarSign, UserPlus, Crown, Clock, Mail, AlertTriangle, BookOpen, Rocket, UserCog, FileText, Newspaper, Sparkles } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import AboutPageEditor from "@/components/AboutPageEditor";
import BlogManagement from "@/components/BlogManagement";
import BlogPostGenerator from "@/components/BlogPostGenerator";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  subscriptionStatus: string;
  createdAt: string;
  updatedAt: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionEndDate?: string;
}

interface UserStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  recentSignups: number;
  subscriptionsByStatus: { status: string; count: number }[];
}

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const { toast } = useToast();
  
  // Test subscriber form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testFirstName, setTestFirstName] = useState("");
  const [testLastName, setTestLastName] = useState("");
  const [testTier, setTestTier] = useState("trial");

  // Create test subscriber mutation
  const createTestSubscriber = useMutation({
    mutationFn: async (data: { email: string; firstName: string; lastName: string; subscriptionTier: string }) => {
      const response = await fetch("/api/admin/create-test-subscriber", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to create test subscriber");
      }
      
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Test Subscriber Created",
        description: "Test subscriber has been created successfully.",
      });
      // Reset form
      setTestEmail("");
      setTestFirstName("");
      setTestLastName("");
      setTestTier("trial");
      setIsDialogOpen(false);
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/recent-signups'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Creating Test Subscriber",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Check admin status first
  useEffect(() => {
    if (!authLoading && user) {
      apiRequest("/api/subscription/status", "GET")
        .then((data) => {
          setSubscriptionStatus(data);
          setIsCheckingAdmin(false);
        })
        .catch((error) => {
          console.error("Error checking admin status:", error);
          setIsCheckingAdmin(false);
        });
    } else if (!authLoading && !user) {
      setIsCheckingAdmin(false);
    }
  }, [authLoading, user]);

  // Only fetch admin data if user is confirmed admin
  const shouldFetchAdminData = subscriptionStatus?.isAdmin;

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<UserStats>({
    queryKey: ['/api/admin/stats'],
    enabled: shouldFetchAdminData,
  });

  const { data: users, isLoading: usersLoading, error: usersError } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    enabled: shouldFetchAdminData,
  });

  const { data: recentSignups, isLoading: signupsLoading, error: signupsError } = useQuery<User[]>({
    queryKey: ['/api/admin/recent-signups'],
    enabled: shouldFetchAdminData,
  });

  const { data: foundersAvailability } = useQuery<{total: number; sold: number; remaining: number; available: boolean}>({
    queryKey: ['/api/founders/availability'],
    enabled: shouldFetchAdminData,
  });

  // Redirect to login if user is not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = "/api/login";
    }
  }, [authLoading, user]);

  // Show loading while checking auth or redirecting
  if (authLoading || (!authLoading && !user)) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 animate-spin" />
              Checking Authentication...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Please wait while we verify your access.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user is not an admin
  if (!isCheckingAdmin && !subscriptionStatus?.isAdmin) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You don't have administrator privileges to access this dashboard. 
                Please contact an administrator if you believe this is an error.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check for authorization errors (fallback)
  const hasAuthError = statsError || usersError || signupsError;
  const isUnauthorized = hasAuthError && (
    (statsError as any)?.message?.includes('Admin access required') ||
    (usersError as any)?.message?.includes('Admin access required') ||
    (signupsError as any)?.message?.includes('Admin access required') ||
    (statsError as any)?.response?.status === 403 ||
    (usersError as any)?.response?.status === 403 ||
    (signupsError as any)?.response?.status === 403
  );

  if (isUnauthorized) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You don't have administrator privileges to access this dashboard. 
                Please contact an administrator if you believe this is an error.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (authLoading || isCheckingAdmin || statsLoading || usersLoading || signupsLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </CardHeader>
              </Card>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'canceled':
        return 'bg-red-500';
      case 'past_due':
        return 'bg-yellow-500';
      case 'unpaid':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'canceled':
        return 'Canceled';
      case 'past_due':
        return 'Past Due';
      case 'unpaid':
        return 'Unpaid';
      case null:
      case undefined:
      case 'none':
        return 'Free';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="title-admin-dashboard">
              Administrator Dashboard
            </h1>
            <p className="text-muted-foreground" data-testid="text-dashboard-description">
              Monitor user sign-ups, subscriptions, and platform analytics
            </p>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default" size="sm" data-testid="button-create-test-subscriber">
                  <UserCog className="h-4 w-4 mr-2" />
                  Create Test Subscriber
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]" data-testid="dialog-create-test-subscriber">
                <DialogHeader>
                  <DialogTitle>Create Test Subscriber</DialogTitle>
                  <DialogDescription>
                    Create a test subscriber to test subscriber-facing features.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="test@example.com"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      data-testid="input-test-email"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={testFirstName}
                      onChange={(e) => setTestFirstName(e.target.value)}
                      data-testid="input-test-firstname"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      value={testLastName}
                      onChange={(e) => setTestLastName(e.target.value)}
                      data-testid="input-test-lastname"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tier">Subscription Tier</Label>
                    <Select value={testTier} onValueChange={setTestTier}>
                      <SelectTrigger id="tier" data-testid="select-test-tier">
                        <SelectValue placeholder="Select tier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trial">Trial (0 novels/month - Refine only)</SelectItem>
                        <SelectItem value="basic">Basic (5 novels/month)</SelectItem>
                        <SelectItem value="pro">Pro (20 novels/month)</SelectItem>
                        <SelectItem value="premium">Premium (50 novels/month)</SelectItem>
                        <SelectItem value="founders">Founders (100 novels/month)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel-test-subscriber"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (!testEmail || !testFirstName || !testLastName) {
                        toast({
                          title: "Missing Fields",
                          description: "Please fill in all fields",
                          variant: "destructive",
                        });
                        return;
                      }
                      createTestSubscriber.mutate({
                        email: testEmail,
                        firstName: testFirstName,
                        lastName: testLastName,
                        subscriptionTier: testTier,
                      });
                    }}
                    disabled={createTestSubscriber.isPending}
                    data-testid="button-submit-test-subscriber"
                  >
                    {createTestSubscriber.isPending ? "Creating..." : "Create Test Subscriber"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Link href="/">
              <Button variant="outline" size="sm" data-testid="button-novel-generator">
                <BookOpen className="h-4 w-4 mr-2" />
                Novel Generator
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total-users">
                {stats?.totalUsers || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Registered accounts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <Crown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-active-subscriptions">
                {stats?.activeSubscriptions || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Paying customers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-revenue">
                ${stats?.totalRevenue || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Estimated monthly
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Signups</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-recent-signups">
                {stats?.recentSignups || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Last 7 days
              </p>
            </CardContent>
          </Card>

          <Card className="border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Founders Tier</CardTitle>
              <Rocket className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-700" data-testid="stat-founders-sold">
                {foundersAvailability?.sold || 0} / {foundersAvailability?.total || 100}
              </div>
              <p className="text-xs text-amber-600">
                {foundersAvailability?.remaining || 100} slots remaining
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Admin Content */}
        <Tabs defaultValue="dashboard" className="mt-8">
          <TabsList className="grid w-full grid-cols-4" data-testid="admin-tabs">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">
              <Users className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="about" data-testid="tab-about">
              <FileText className="h-4 w-4 mr-2" />
              About Page
            </TabsTrigger>
            <TabsTrigger value="blog" data-testid="tab-blog">
              <Newspaper className="h-4 w-4 mr-2" />
              Blog Management
            </TabsTrigger>
            <TabsTrigger value="blog-generator" data-testid="tab-blog-generator">
              <Sparkles className="h-4 w-4 mr-2" />
              Blog Generator
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Recent Signups */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Recent Sign-ups
                  </CardTitle>
                  <CardDescription>
                    Latest user registrations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentSignups?.slice(0, 10).map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`user-recent-${user.id}`}>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <Mail className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm" data-testid={`text-user-name-${user.id}`}>
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground" data-testid={`text-user-email-${user.id}`}>
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className={getStatusColor(user.subscriptionStatus)}>
                            {getStatusLabel(user.subscriptionStatus)}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Subscription Status Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Subscription Breakdown
                  </CardTitle>
                  <CardDescription>
                    User subscription status overview
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats?.subscriptionsByStatus.map((item) => (
                      <div key={item.status} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`status-breakdown-${item.status}`}>
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(item.status)}`}></div>
                          <span className="font-medium capitalize">
                            {getStatusLabel(item.status)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold" data-testid={`count-${item.status}`}>
                            {item.count}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {((item.count / (stats?.totalUsers || 1)) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* All Users Table */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  All Users
                </CardTitle>
                <CardDescription>
                  Complete user database ({users?.length || 0} total)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">User</th>
                        <th className="text-left p-3 font-medium">Email</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Joined</th>
                        <th className="text-left p-3 font-medium">Customer ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users?.map((user) => (
                        <tr key={user.id} className="border-b hover:bg-muted/50" data-testid={`user-row-${user.id}`}>
                          <td className="p-3">
                            <div>
                              <p className="font-medium" data-testid={`text-name-${user.id}`}>
                                {user.firstName} {user.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ID: {user.id.slice(0, 8)}...
                              </p>
                            </div>
                          </td>
                          <td className="p-3">
                            <p className="text-sm" data-testid={`text-email-${user.id}`}>{user.email}</p>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className={getStatusColor(user.subscriptionStatus)}>
                              {getStatusLabel(user.subscriptionStatus)}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <p className="text-sm">
                              {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                            </p>
                          </td>
                          <td className="p-3">
                            <p className="text-xs font-mono">
                              {user.stripeCustomerId ? user.stripeCustomerId.slice(0, 16) + '...' : 'N/A'}
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="about" className="mt-6">
            <AboutPageEditor />
          </TabsContent>

          <TabsContent value="blog" className="mt-6">
            <BlogManagement />
          </TabsContent>

          <TabsContent value="blog-generator" className="mt-6">
            <BlogPostGenerator />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}