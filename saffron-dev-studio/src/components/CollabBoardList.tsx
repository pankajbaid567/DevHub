import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  Plus, 
  Search, 
  Grid, 
  List, 
  MoreHorizontal,
  Users,
  Clock,
  Globe,
  Lock,
  Star,
  Edit,
  Trash2,
  Copy,
  Share2,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import collabBoardService from '@/services/collabBoardService';

interface Board {
  id: number;
  name: string;
  description?: string;
  isPublic: boolean;
  boardData: any;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: number;
    fullName: string;
    username: string;
  };
  collaborators: Array<{
    id: number;
    role: string;
    user: {
      id: number;
      fullName: string;
      username: string;
    };
  }>;
  _count: {
    collaborators: number;
  };
}

interface CollabBoardListProps {
  onBoardSelect: (board: Board) => void;
  onCreateBoard: () => void;
  className?: string;
}

const CollabBoardList: React.FC<CollabBoardListProps> = ({
  onBoardSelect,
  onCreateBoard,
  className = ''
}) => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<'my-boards' | 'public' | 'shared'>('my-boards');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchBoards();
  }, [filterType, page]);

  const fetchBoards = async () => {
    try {
      setLoading(true);
      const response = await collabBoardService.getBoards({
        type: filterType,
        page,
        limit: 12
      });
      
      if (page === 1) {
        setBoards(response.boards);
      } else {
        setBoards(prev => [...prev, ...response.boards]);
      }
      
      setHasMore(response.pagination.page < response.pagination.pages);
    } catch (error) {
      console.error('Failed to fetch boards:', error);
      toast({
        title: "Error",
        description: "Failed to load boards. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchBoards();
      return;
    }

    try {
      setLoading(true);
      const response = await collabBoardService.searchBoards(searchQuery);
      setBoards(response.boards);
      setHasMore(false);
    } catch (error) {
      console.error('Search failed:', error);
      toast({
        title: "Search Error",
        description: "Failed to search boards. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBoard = async (boardId: number) => {
    if (!window.confirm('Are you sure you want to delete this board?')) return;

    try {
      await collabBoardService.deleteBoard(boardId);
      setBoards(prev => prev.filter(board => board.id !== boardId));
      toast({
        title: "Board Deleted",
        description: "The board has been deleted successfully.",
      });
    } catch (error) {
      console.error('Delete failed:', error);
      toast({
        title: "Delete Error",
        description: "Failed to delete board. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDuplicateBoard = async (board: Board) => {
    try {
      const response = await collabBoardService.duplicateBoard(board.id, {
        name: `${board.name} (Copy)`,
        description: board.description
      });
      
      setBoards(prev => [response.board, ...prev]);
      toast({
        title: "Board Duplicated",
        description: "The board has been duplicated successfully.",
      });
    } catch (error) {
      console.error('Duplicate failed:', error);
      toast({
        title: "Duplicate Error",
        description: "Failed to duplicate board. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const getBoardThumbnail = (boardData: any) => {
    // Generate a simple thumbnail based on board data
    if (!boardData || Object.keys(boardData).length === 0) {
      return (
        <div className="w-full h-32 bg-muted flex items-center justify-center">
          <span className="text-muted-foreground text-sm">Empty Board</span>
        </div>
      );
    }
    
    return (
      <div className="w-full h-32 bg-muted flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Board Preview</span>
      </div>
    );
  };

  if (loading && boards.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading boards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Collaborative Boards</h2>
          <p className="text-muted-foreground">Create and manage your collaborative workspaces</p>
        </div>
        <Button onClick={onCreateBoard} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          New Board
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search boards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant={filterType === 'my-boards' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('my-boards')}
              >
                My Boards
              </Button>
              <Button
                variant={filterType === 'public' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('public')}
              >
                Public
              </Button>
              <Button
                variant={filterType === 'shared' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('shared')}
              >
                Shared
              </Button>
            </div>

            <div className="flex items-center space-x-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Boards Grid/List */}
      {boards.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Grid className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No boards found</h3>
            <p className="text-muted-foreground mb-4">
              {filterType === 'my-boards' 
                ? "You haven't created any boards yet."
                : "No public boards available at the moment."
              }
            </p>
            <Button onClick={onCreateBoard}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Board
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
        }>
          {boards.map((board) => (
            <Card 
              key={board.id} 
              className="group hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onBoardSelect(board)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{board.name}</CardTitle>
                    {board.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {board.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateBoard(board);
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBoard(board.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {/* Board Thumbnail */}
                {viewMode === 'grid' && getBoardThumbnail(board.boardData)}
                
                {/* Board Info */}
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center space-x-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${board.creator.username}`} />
                      <AvatarFallback className="text-xs">
                        {board.creator.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">
                      {board.creator.username}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {board.isPublic ? (
                      <Badge variant="outline" className="text-xs">
                        <Globe className="w-3 h-3 mr-1" />
                        Public
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        <Lock className="w-3 h-3 mr-1" />
                        Private
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Board Stats */}
                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Users className="w-3 h-3" />
                      <span>{board._count.collaborators}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(board.updatedAt)}</span>
                    </div>
                  </div>
                  
                  {viewMode === 'list' && (
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && boards.length > 0 && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => setPage(prev => prev + 1)}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default CollabBoardList;
