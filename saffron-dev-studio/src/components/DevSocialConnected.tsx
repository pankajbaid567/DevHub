import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { 
  MessageCircle, 
  Heart, 
  Share2, 
  Plus,
  Send,
  Code,
  MoreHorizontal,
  UserPlus,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import socialService from "@/services/socialService";
import { Link } from "react-router-dom";

interface Post {
  id: number;
  content: string;
  codeSnippet?: string;
  language?: string;
  imageUrl?: string;
  createdAt: string;
  author: {
    id: number;
    username: string;
    fullName: string;
    profilePicture?: string;
  };
  comments?: Array<{
    id: number;
    content: string;
    createdAt: string;
    user: {
      id: number;
      username: string;
      fullName: string;
      profilePicture?: string;
    };
  }>;
  _count: {
    likes: number;
    comments: number;
    shares: number;
  };
  likes?: Array<{ userId: number }>;
}

const DevSocialConnected = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [newPost, setNewPost] = useState("");
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const { user: currentUser, isAuthenticated } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      fetchPosts();
    }
  }, [isAuthenticated]);

  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      const response = await socialService.getPosts({ page: 1, limit: 10 });
      setPosts(response.posts || []);
    } catch (error) {
      toast({
        title: "Failed to load posts",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.trim()) return;

    try {
      setIsCreatingPost(true);
      const postData = {
        content: newPost
      };

      const response = await socialService.createPost(postData);
      
      // Add the new post to the beginning of the posts array
      setPosts(prev => [response.post, ...prev]);
      setNewPost("");
      setIsPostModalOpen(false);
      
      toast({
        title: "Post Created",
        description: "Your post has been shared with the community!",
      });
    } catch (error) {
      toast({
        title: "Failed to create post",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingPost(false);
    }
  };

  const handleLike = async (postId: number) => {
    try {
      await socialService.toggleLike(postId);
      
      // Update the posts state to reflect the like change
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          const isLiked = post.likes?.some(like => like.userId === currentUser?.id);
          return {
            ...post,
            _count: {
              ...post._count,
              likes: isLiked ? post._count.likes - 1 : post._count.likes + 1
            }
          };
        }
        return post;
      }));
    } catch (error) {
      toast({
        title: "Failed to like post",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return "Just now";
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md border-border shadow-hover">
          <CardContent className="pt-6 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">
                Welcome to{" "}
                <span className="bg-gradient-hero bg-clip-text text-transparent">
                  DevHub+
                </span>
              </h2>
              <p className="text-muted-foreground">
                You need to be logged in to access the DevSocial feed and connect with fellow developers.
              </p>
            </div>
            <div className="space-y-3">
              <Button asChild className="w-full bg-gradient-primary text-white hover:shadow-hover">
                <Link to="/login">Sign In</Link>
              </Button>
              <Button asChild variant="outline" className="w-full border-primary text-primary hover:bg-accent/20">
                <Link to="/signup">Create Account</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Create Post Card */}
      <Card className="border-border shadow-soft">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <Avatar>
              <AvatarImage src={currentUser?.profilePicture} />
              <AvatarFallback>
                {currentUser?.fullName?.charAt(0) || currentUser?.username?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <Dialog open={isPostModalOpen} onOpenChange={setIsPostModalOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="flex-1 justify-start text-muted-foreground hover:bg-accent/20"
                >
                  What's on your mind, {currentUser?.fullName?.split(' ')[0] || currentUser?.username}?
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create a Post</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={currentUser?.profilePicture} />
                      <AvatarFallback>
                        {currentUser?.fullName?.charAt(0) || currentUser?.username?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{currentUser?.fullName || currentUser?.username}</p>
                      <Badge variant="secondary" className="text-xs">Public</Badge>
                    </div>
                  </div>
                  <Textarea
                    placeholder="Share your thoughts, code snippets, or ask questions..."
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    className="min-h-[120px] resize-none border-border"
                  />
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm">
                        <Code className="w-4 h-4 mr-2" />
                        Code
                      </Button>
                    </div>
                    <Button 
                      onClick={handleCreatePost}
                      disabled={!newPost.trim() || isCreatingPost}
                      className="bg-gradient-primary text-white"
                    >
                      {isCreatingPost ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      Post
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Posts Feed */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border">
              <CardContent className="pt-6">
                <div className="animate-pulse space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-muted rounded-full"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-24"></div>
                      <div className="h-3 bg-muted rounded w-16"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <Card className="border-border">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No posts yet. Be the first to share something!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <Card key={post.id} className="border-border shadow-soft">
              <CardContent className="pt-6">
                {/* Post Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={post.author.profilePicture} />
                      <AvatarFallback>
                        {post.author.fullName?.charAt(0) || post.author.username?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{post.author.fullName || post.author.username}</p>
                      <p className="text-sm text-muted-foreground">
                        @{post.author.username} • {formatTimeAgo(post.createdAt)}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>

                {/* Post Content */}
                <div className="mb-4">
                  <p className="text-foreground leading-relaxed">{post.content}</p>
                  
                  {post.codeSnippet && (
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary">{post.language || 'code'}</Badge>
                      </div>
                      <pre className="text-sm text-foreground font-mono overflow-x-auto">
                        <code>{post.codeSnippet}</code>
                      </pre>
                    </div>
                  )}
                </div>

                {/* Comments Section */}
                {post.comments && post.comments.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {post.comments.map((comment) => (
                      <div key={comment.id} className="flex space-x-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={comment.user.profilePicture} />
                          <AvatarFallback>
                            {comment.user.fullName?.charAt(0) || comment.user.username?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 bg-muted rounded-lg p-3">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-sm">
                              {comment.user.fullName || comment.user.username}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatTimeAgo(comment.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Separator className="my-4" />

                {/* Post Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleLike(post.id)}
                      className="text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <Heart className="w-4 h-4 mr-2" />
                      {post._count.likes}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      {post._count.comments}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                      <Share2 className="w-4 h-4 mr-2" />
                      {post._count.shares}
                    </Button>
                  </div>
                </div>

                {/* Add Comment Section */}
                <div className="mt-4 flex space-x-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={currentUser?.profilePicture} />
                    <AvatarFallback>
                      {currentUser?.fullName?.charAt(0) || currentUser?.username?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CommentInput postId={post.id} onCommentAdded={(newComment) => {
                      setPosts(prev => prev.map(p => 
                        p.id === post.id 
                          ? { 
                              ...p, 
                              comments: [...(p.comments || []), newComment],
                              _count: { ...p._count, comments: p._count.comments + 1 }
                            }
                          : p
                      ));
                    }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// Comment Input Component
interface CommentInputProps {
  postId: number;
  onCommentAdded: (comment: any) => void;
}

const CommentInput: React.FC<CommentInputProps> = ({ postId, onCommentAdded }) => {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    try {
      setIsSubmitting(true);
      const response = await socialService.addComment(postId, comment.trim());
      
      onCommentAdded(response.comment);
      setComment("");
      
      toast({
        title: "Comment Added",
        description: "Your comment has been posted!",
      });
    } catch (error) {
      toast({
        title: "Failed to add comment",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex space-x-2">
      <Input
        placeholder="Write a comment..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="flex-1 border-border focus:border-primary"
        disabled={isSubmitting}
      />
      <Button 
        type="submit" 
        size="sm" 
        disabled={!comment.trim() || isSubmitting}
        className="bg-gradient-primary text-white hover:shadow-hover"
      >
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </Button>
    </form>
  );
};

export default DevSocialConnected;
