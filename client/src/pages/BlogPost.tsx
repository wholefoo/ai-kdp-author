import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Clock, Tag, Eye, Calendar, BookOpen } from "lucide-react";
import type { BlogPost as BlogPostType } from "@shared/schema";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import BlogFooter from "@/components/BlogFooter";

export default function BlogPost() {
  const [, params] = useRoute("/blog/:slug");
  const slug = params?.slug;

  const { data: post, isLoading } = useQuery<BlogPostType>({
    queryKey: [`/api/blog/posts/${slug}`],
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-12 max-w-4xl text-center">
          <h1 className="text-3xl font-bold mb-4">Article Not Found</h1>
          <p className="text-muted-foreground mb-8">The article you're looking for doesn't exist.</p>
          <Link href="/blog">
            <Button data-testid="back-to-blog-btn">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Helmet>
        <title>{post.title} | AI KDP Author Blog</title>
        <meta name="description" content={post.excerpt} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
      </Helmet>

      {/* Blog Header */}
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <div className="text-center mb-8 relative">
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
      </div>

      <article className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Back Button */}
        <Link href="/blog">
          <Button variant="ghost" className="mb-8 hover:bg-primary/10 transition-colors" data-testid="back-to-blog-link">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog
          </Button>
        </Link>

        {/* Article Header */}
        <header className="mb-12 relative">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 to-transparent rounded-3xl blur-3xl" />
          
          <div className="flex flex-wrap items-center gap-3 mb-6 bg-muted/30 rounded-xl p-4 backdrop-blur-sm">
            <Badge variant="secondary" className="font-semibold shadow-sm" data-testid="post-category">
              {post.category}
            </Badge>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span data-testid="post-read-time">{post.readTime} min read</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Eye className="w-4 h-4" />
              <span data-testid="post-views">{post.views || 0} views</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span data-testid="post-date">
                {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) : 'Not published'}
              </span>
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text" data-testid="post-title">
            {post.title}
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed border-l-4 border-primary pl-4" data-testid="post-excerpt">
            {post.excerpt}
          </p>

          <div className="flex flex-wrap gap-2 mb-6">
            {post.tags?.map((tag, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-muted to-muted/50 rounded-full text-sm font-medium shadow-sm hover:shadow-md transition-shadow"
                data-testid={`post-tag-${idx}`}
              >
                <Tag className="w-3 h-3" />
                {tag}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-4 border-t">
            <span className="font-medium" data-testid="post-author">By {post.author}</span>
          </div>
        </header>

        {/* Article Content */}
        <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-headings:mb-4 prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-img:shadow-lg prose-code:bg-muted prose-code:px-2 prose-code:py-1 prose-code:rounded" data-testid="post-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {post.content}
          </ReactMarkdown>
        </div>

        {/* Back to Blog CTA */}
        <div className="mt-16 pt-8 border-t bg-muted/30 rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-bold mb-4">Want to Read More?</h3>
          <p className="text-muted-foreground mb-6">
            Explore more expert insights and actionable strategies for KDP publishing
          </p>
          <Link href="/blog">
            <Button size="lg" variant="outline" className="hover:bg-primary/10" data-testid="bottom-back-to-blog-btn">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Browse All Articles
            </Button>
          </Link>
        </div>
      </article>
      
      <BlogFooter />
    </div>
  );
}
