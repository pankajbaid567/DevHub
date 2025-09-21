const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

// Get all posts with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, userId, filter = 'all' } = req.query;
    const skip = (page - 1) * limit;

    let whereClause = {
      isPublic: true
    };

    if (userId) {
      whereClause.authorId = parseInt(userId);
    }

    const posts = await prisma.post.findMany({
      where: whereClause,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            fullName: true,
            profilePicture: true,
            developerProfile: {
              select: {
                title: true,
                company: true
              }
            }
          }
        },
        likes: {
          select: {
            userId: true
          }
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                fullName: true,
                profilePicture: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        shares: {
          select: {
            userId: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            shares: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    // Add computed fields for current user
    const postsWithUserData = posts.map(post => ({
      ...post,
      isLiked: false, // Will be set based on auth user
      isBookmarked: false, // Will be set based on auth user
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
      sharesCount: post._count.shares
    }));

    res.json({
      posts: postsWithUserData,
      hasMore: posts.length === parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new post
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { content, type = 'text', codeSnippet, language, imageUrl, projectUrl, tags = [] } = req.body;

    if (!content && !codeSnippet && !imageUrl) {
      return res.status(400).json({ error: 'Post must have content, code snippet, or image' });
    }

    const post = await prisma.post.create({
      data: {
        content: content || '',
        codeSnippet,
        language,
        imageUrl,
        tags,
        authorId: userId,
        isPublic: true
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            fullName: true,
            profilePicture: true,
            developerProfile: {
              select: {
                title: true,
                company: true
              }
            }
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            shares: true
          }
        }
      }
    });

    res.status(201).json({
      ...post,
      isLiked: false,
      isBookmarked: false,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      comments: []
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Like/unlike a post
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = parseInt(req.params.id);

    // Check if already liked
    const existingLike = await prisma.like.findUnique({
      where: {
        postId_userId: {
          postId,
          userId
        }
      }
    });

    if (existingLike) {
      // Unlike
      await prisma.like.delete({
        where: {
          postId_userId: {
            postId,
            userId
          }
        }
      });
      res.json({ message: 'Post unliked' });
    } else {
      // Like
      await prisma.like.create({
        data: {
          postId,
          userId
        }
      });
      res.json({ message: 'Post liked' });
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add comment to a post
router.post('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = parseInt(req.params.id);
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        postId,
        userId
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            profilePicture: true
          }
        }
      }
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Share a post
router.post('/:id/share', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = parseInt(req.params.id);

    // Check if already shared
    const existingShare = await prisma.share.findUnique({
      where: {
        postId_userId: {
          postId,
          userId
        }
      }
    });

    if (existingShare) {
      return res.status(400).json({ error: 'Post already shared' });
    }

    await prisma.share.create({
      data: {
        postId,
        userId
      }
    });

    res.json({ message: 'Post shared' });
  } catch (error) {
    console.error('Error sharing post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bookmark/unbookmark a post (placeholder for future implementation)
router.post('/:id/bookmark', authMiddleware, async (req, res) => {
  try {
    // For now, just return success
    res.json({ message: 'Bookmark feature coming soon' });
  } catch (error) {
    console.error('Error bookmarking post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get trending posts
router.get('/trending', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const posts = await prisma.post.findMany({
      where: {
        isPublic: true,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            fullName: true,
            profilePicture: true,
            developerProfile: {
              select: {
                title: true,
                company: true
              }
            }
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            shares: true
          }
        }
      },
      orderBy: [
        { likes: { _count: 'desc' } },
        { comments: { _count: 'desc' } },
        { createdAt: 'desc' }
      ],
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    const postsWithUserData = posts.map(post => ({
      ...post,
      isLiked: false,
      isBookmarked: false,
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
      sharesCount: post._count.shares
    }));

    res.json({
      posts: postsWithUserData,
      hasMore: posts.length === parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching trending posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get posts from followed users
router.get('/following', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Get users that current user follows
    const follows = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true }
    });

    const followingIds = follows.map(f => f.followingId);

    if (followingIds.length === 0) {
      return res.json({ posts: [], hasMore: false });
    }

    const posts = await prisma.post.findMany({
      where: {
        isPublic: true,
        authorId: {
          in: followingIds
        }
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            fullName: true,
            profilePicture: true,
            developerProfile: {
              select: {
                title: true,
                company: true
              }
            }
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            shares: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    const postsWithUserData = posts.map(post => ({
      ...post,
      isLiked: false,
      isBookmarked: false,
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
      sharesCount: post._count.shares
    }));

    res.json({
      posts: postsWithUserData,
      hasMore: posts.length === parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching following posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;