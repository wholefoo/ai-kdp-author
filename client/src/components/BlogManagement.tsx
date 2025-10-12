import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PlusCircle, Edit, Trash2, Eye, Calendar } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { BlogPost } from "@shared/schema";

const CATEGORIES = ["KDP Tips", "Writing Craft", "Marketing", "Research", "Sales"];

export default function BlogManagement() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deletePostId, setDeletePostId] = useState<number | null>(null);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    category: "KDP Tips",
    tags: "",
    author: "AI KDP Author Team",
    published: true,
  });

  const { data: posts, isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/admin/blog/posts"],
  });

  const createPost = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/admin/blog/posts", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Blog Post Created",
        description: "Your blog post has been created successfully.",
      });
      resetForm();
      setIsCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog/posts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Creating Post",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePost = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/admin/blog/posts/${id}`, "PUT", data);
    },
    onSuccess: () => {
      toast({
        title: "Blog Post Updated",
        description: "Your blog post has been updated successfully.",
      });
      resetForm();
      setIsEditDialogOpen(false);
      setEditingPost(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog/posts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Updating Post",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletePost = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/blog/posts/${id}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Blog Post Deleted",
        description: "The blog post has been deleted successfully.",
      });
      setDeletePostId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog/posts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Deleting Post",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      category: "KDP Tips",
      tags: "",
      author: "AI KDP Author Team",
      published: true,
    });
  };

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      category: post.category,
      tags: post.tags?.join(", ") || "",
      author: post.author,
      published: post.published,
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmit = () => {
    const tags = formData.tags.split(",").map(t => t.trim()).filter(t => t.length > 0);
    const wordCount = formData.content.split(/\s+/).filter(w => w.length > 0).length;
    const readTime = Math.ceil(wordCount / 200);

    const postData = {
      ...formData,
      tags,
      wordCount,
      readTime,
    };

    if (editingPost) {
      updatePost.mutate({ id: editingPost.id, data: postData });
    } else {
      createPost.mutate(postData);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle data-testid="title-blog-management">Blog Management</CardTitle>
            <CardDescription>Create, edit, and manage blog posts</CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-blog-post">
                <PlusCircle className="h-4 w-4 mr-2" />
                New Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-create-blog-post">
              <DialogHeader>
                <DialogTitle>Create New Blog Post</DialogTitle>
                <DialogDescription>
                  Add a new article to your blog
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="How to Write Your First Novel"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    data-testid="input-blog-title"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="slug">Slug (URL)</Label>
                  <Input
                    id="slug"
                    placeholder="how-to-write-your-first-novel"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    data-testid="input-blog-slug"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger data-testid="select-blog-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="excerpt">Excerpt</Label>
                  <Textarea
                    id="excerpt"
                    placeholder="A brief summary of your article..."
                    value={formData.excerpt}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                    rows={3}
                    data-testid="input-blog-excerpt"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    placeholder="Write your article content here..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={10}
                    data-testid="input-blog-content"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    placeholder="writing, tips, beginners"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    data-testid="input-blog-tags"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="author">Author</Label>
                  <Input
                    id="author"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    data-testid="input-blog-author"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="published"
                    checked={formData.published}
                    onCheckedChange={(checked) => setFormData({ ...formData, published: checked })}
                    data-testid="switch-blog-published"
                  />
                  <Label htmlFor="published" className="cursor-pointer">
                    Publish immediately
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { resetForm(); setIsCreateDialogOpen(false); }} data-testid="button-cancel-create">
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={createPost.isPending} data-testid="button-submit-create">
                  {createPost.isPending ? "Creating..." : "Create Post"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {posts && posts.length > 0 ? (
            posts.map((post) => (
              <div
                key={post.id}
                className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                data-testid={`blog-post-item-${post.id}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold" data-testid={`blog-title-${post.id}`}>{post.title}</h3>
                    <Badge variant={post.published ? "default" : "secondary"} data-testid={`blog-status-${post.id}`}>
                      {post.published ? "Published" : "Draft"}
                    </Badge>
                    <Badge variant="outline" data-testid={`blog-category-${post.id}`}>{post.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2" data-testid={`blog-excerpt-${post.id}`}>
                    {post.excerpt}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {post.views || 0} views
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : "Not published"}
                    </span>
                    <span>{post.wordCount} words</span>
                    <span>{post.readTime} min read</span>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(post)}
                    data-testid={`button-edit-${post.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeletePostId(post.id)}
                    data-testid={`button-delete-${post.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No blog posts yet. Create your first post to get started.
            </div>
          )}
        </div>
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { 
        setIsEditDialogOpen(open);
        if (!open) {
          resetForm();
          setEditingPost(null);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-blog-post">
          <DialogHeader>
            <DialogTitle>Edit Blog Post</DialogTitle>
            <DialogDescription>
              Update your blog post
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                data-testid="input-edit-blog-title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-slug">Slug (URL)</Label>
              <Input
                id="edit-slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                data-testid="input-edit-blog-slug"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger data-testid="select-edit-blog-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-excerpt">Excerpt</Label>
              <Textarea
                id="edit-excerpt"
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                rows={3}
                data-testid="input-edit-blog-excerpt"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-content">Content</Label>
              <Textarea
                id="edit-content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={10}
                data-testid="input-edit-blog-content"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
              <Input
                id="edit-tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                data-testid="input-edit-blog-tags"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-author">Author</Label>
              <Input
                id="edit-author"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                data-testid="input-edit-blog-author"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="edit-published"
                checked={formData.published}
                onCheckedChange={(checked) => setFormData({ ...formData, published: checked })}
                data-testid="switch-edit-blog-published"
              />
              <Label htmlFor="edit-published" className="cursor-pointer">
                Publish immediately
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => { 
                resetForm(); 
                setIsEditDialogOpen(false); 
                setEditingPost(null);
              }}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={updatePost.isPending} data-testid="button-submit-edit">
              {updatePost.isPending ? "Updating..." : "Update Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletePostId !== null} onOpenChange={(open) => !open && setDeletePostId(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the blog post.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePostId && deletePost.mutate(deletePostId)}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
