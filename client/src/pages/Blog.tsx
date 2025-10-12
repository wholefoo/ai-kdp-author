import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Clock, Tag } from "lucide-react";
import type { BlogPost } from "@shared/schema";
import BlogFooter from "@/components/BlogFooter";

export default function Blog() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  
  const { data: posts, isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog/posts"],
  });

  // Filter posts based on selected category
  const filteredPosts = selectedCategory === "All" 
    ? posts 
    : posts?.filter(post => post.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Helmet>
        <title>AI KDP Author Blog - Tips, Strategies & Guides for Self-Publishers</title>
        <meta name="description" content="Expert tips and strategies for Amazon KDP authors. Learn about book optimization, marketing, keyword research, pricing strategies, and more from our comprehensive publishing blog." />
        <meta property="og:title" content="AI KDP Author Blog" />
        <meta property="og:description" content="Expert tips and strategies for Amazon KDP self-published authors" />
      </Helmet>

      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12 relative">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 to-transparent rounded-3xl blur-3xl" />
          
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-primary/5 rounded-full mb-6 shadow-sm">
            <BookOpen className="w-5 h-5 text-primary animate-pulse" />
            <span className="text-sm font-semibold text-primary">KDP Publishing Resources</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent leading-tight pb-2">
            AI KDP Author Blog
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Expert insights, actionable strategies, and proven tips to help you succeed as a self-published author on Amazon KDP
          </p>
          
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="h-1 w-8 bg-gradient-to-r from-transparent to-primary/50 rounded-full" />
            <span className="font-medium">Fresh content weekly</span>
            <div className="h-1 w-8 bg-gradient-to-l from-transparent to-primary/50 rounded-full" />
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-12 bg-muted/30 rounded-2xl p-6 backdrop-blur-sm">
          <Badge 
            variant={selectedCategory === "All" ? "default" : "outline"}
            className="cursor-pointer hover:bg-primary/20 hover:scale-105 transition-all duration-200 px-4 py-2 text-sm font-medium shadow-sm" 
            onClick={() => setSelectedCategory("All")}
            data-testid="category-filter-all"
          >
            All Articles
          </Badge>
          <Badge 
            variant={selectedCategory === "KDP Tips" ? "default" : "outline"}
            className="cursor-pointer hover:bg-primary/20 hover:scale-105 transition-all duration-200 px-4 py-2 text-sm font-medium shadow-sm" 
            onClick={() => setSelectedCategory("KDP Tips")}
            data-testid="category-filter-kdp-tips"
          >
            KDP Tips
          </Badge>
          <Badge 
            variant={selectedCategory === "Writing Craft" ? "default" : "outline"}
            className="cursor-pointer hover:bg-primary/20 hover:scale-105 transition-all duration-200 px-4 py-2 text-sm font-medium shadow-sm" 
            onClick={() => setSelectedCategory("Writing Craft")}
            data-testid="category-filter-writing-craft"
          >
            Writing Craft
          </Badge>
          <Badge 
            variant={selectedCategory === "Marketing" ? "default" : "outline"}
            className="cursor-pointer hover:bg-primary/20 hover:scale-105 transition-all duration-200 px-4 py-2 text-sm font-medium shadow-sm" 
            onClick={() => setSelectedCategory("Marketing")}
            data-testid="category-filter-marketing"
          >
            Marketing
          </Badge>
          <Badge 
            variant={selectedCategory === "Research" ? "default" : "outline"}
            className="cursor-pointer hover:bg-primary/20 hover:scale-105 transition-all duration-200 px-4 py-2 text-sm font-medium shadow-sm" 
            onClick={() => setSelectedCategory("Research")}
            data-testid="category-filter-research"
          >
            Research
          </Badge>
          <Badge 
            variant={selectedCategory === "Sales" ? "default" : "outline"}
            className="cursor-pointer hover:bg-primary/20 hover:scale-105 transition-all duration-200 px-4 py-2 text-sm font-medium shadow-sm" 
            onClick={() => setSelectedCategory("Sales")}
            data-testid="category-filter-sales"
          >
            Sales
          </Badge>
        </div>

        {/* Blog Posts Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="h-full">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts?.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                data-testid={`blog-card-${post.slug}`}
              >
                <Card className="h-full hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group border-2 hover:border-primary/20 bg-gradient-to-br from-background to-muted/20">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="secondary" className="text-xs font-semibold shadow-sm" data-testid={`badge-category-${post.slug}`}>
                        {post.category}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span data-testid={`read-time-${post.slug}`}>{post.readTime} min read</span>
                      </div>
                    </div>
                    <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors leading-tight mb-3" data-testid={`title-${post.slug}`}>
                      {post.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-3 text-sm leading-relaxed" data-testid={`excerpt-${post.slug}`}>
                      {post.excerpt}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {post.tags?.slice(0, 3).map((tag, idx) => (
                        <div
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-md text-xs text-muted-foreground hover:bg-muted transition-colors"
                          data-testid={`tag-${post.slug}-${idx}`}
                        >
                          <Tag className="w-3 h-3" />
                          {tag}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {!isLoading && filteredPosts?.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No articles found</h3>
            <p className="text-muted-foreground">
              {selectedCategory === "All" 
                ? "Check back soon for new content!" 
                : `No articles found in the "${selectedCategory}" category. Try selecting a different category.`}
            </p>
          </div>
        )}
      </div>
      
      <BlogFooter />
    </div>
  );
}
