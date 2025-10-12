import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Helmet } from "react-helmet-async";
import BlogFooter from "@/components/BlogFooter";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AboutPageData {
  title: string;
  content: string;
  updatedAt: string;
}

export default function About() {
  const { data: aboutPage, isLoading } = useQuery<AboutPageData>({
    queryKey: ['/api/about'],
  });

  const pageTitle = aboutPage?.title || "About AI KDP Author";
  const pageDescription = aboutPage?.content?.substring(0, 160) || "Learn about AI KDP Author - the AI-powered novel generation platform for Amazon KDP authors.";

  return (
    <>
      <Helmet>
        <title>{pageTitle} - AI KDP Author</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={`${pageTitle} - AI KDP Author`} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://ai-kdp-author.com/about" />
        <link rel="canonical" href="https://ai-kdp-author.com/about" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        {/* Header Section */}
        <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 py-12">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h1 className="text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent leading-tight pb-2">
              AI KDP Author
            </h1>
            <p className="text-xl lg:text-2xl text-gray-600 dark:text-gray-300 mb-3">
              Generate complete, publishable novels for Amazon KDP
            </p>
            <p className="text-base text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              From idea to publication-ready manuscript in minutes. Create 50,000-80,000 word novels, audiobooks, and comprehensive analysis tools - all powered by advanced AI.
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-12">
          <Link href="/">
            <Button variant="ghost" className="mb-8" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 md:p-12">
            {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : (
            <>
              <h1 className="text-4xl font-bold mb-6 text-gray-900 dark:text-gray-100">
                {aboutPage?.title || "About AI KDP Author"}
              </h1>
              
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {aboutPage?.content || "Welcome to AI KDP Author"}
                </ReactMarkdown>
              </div>

              <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Last Updated: {aboutPage?.updatedAt ? new Date(aboutPage.updatedAt).toLocaleDateString() : 'Recently'}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
      
      <BlogFooter />
      </div>
    </>
  );
}
