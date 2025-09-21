const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * GET /api/social/profile
 * Get the current user's social profile
 */
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const profile = await req.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        profilePicture: true,
        bio: true,
        createdAt: true,
        developerProfile: {
          select: {
            bio: true,
            title: true,
            company: true,
            location: true,
            website: true,
            skills: true,
            experience: true,
            githubUrl: true,
            linkedinUrl: true,
            leetcodeId: true,
            codeforcesId: true
          }
        },
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
            questions: true,
            answers: true,
            snippets: true
          }
        }
      }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Add computed stats
    const profileWithStats = {
      ...profile,
      stats: {
        ...profile._count,
        reputation: Math.min(profile._count.followers * 10 + profile._count.posts * 5, 9999)
      }
    };

    res.json({ profile: profileWithStats });

  } catch (error) {
    console.error('Get social profile error:', error);
    res.status(500).json({ error: 'Failed to get social profile' });
  }
});

/**
 * GET /api/social/posts
 * Get posts for the social feed
 */
router.get('/posts', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10, filter = 'all' } = req.query;
    const skip = (page - 1) * limit;
    const userId = req.user.id;

    let whereClause = {};

    // Filter posts based on type
    if (filter === 'following') {
      // Get posts from users that the current user follows
      const following = await req.prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true }
      });
      const followingIds = following.map(f => f.followingId);
      followingIds.push(userId); // Include own posts
      
      whereClause = {
        authorId: { in: followingIds }
      };
    } else if (filter === 'trending') {
      // Get posts with high engagement (likes + comments)
      // This would need a more complex query in production
      whereClause = {};
    }

    const posts = await req.prisma.post.findMany({
      where: whereClause,
      skip: parseInt(skip),
      take: parseInt(limit),
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
          orderBy: { createdAt: 'desc' },
          take: 3 // Only show first 3 comments
        },
        _count: {
          select: { likes: true, comments: true, shares: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const total = await req.prisma.post.count({ where: whereClause });

    res.json({
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Failed to get posts' });
  }
});

/**
 * POST /api/social/posts
 * Create a new post
 */
router.post('/posts', authMiddleware, async (req, res) => {
  try {
    const { content, codeSnippet, language, imageUrl, tags } = req.body;

    if (!content && !codeSnippet && !imageUrl) {
      return res.status(400).json({ error: 'Post must have content, code, or image' });
    }

    const post = await req.prisma.post.create({
      data: {
        content,
        codeSnippet,
        language,
        imageUrl,
        tags: tags || [],
        authorId: req.user.id
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
          select: { likes: true, comments: true, shares: true }
        }
      }
    });

    res.status(201).json({
      message: 'Post created successfully',
      post
    });

  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

/**
 * POST /api/social/posts/:id/like
 * Like or unlike a post
 */
router.post('/posts/:id/like', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

        // Check if already liked
        const existingLike = await req.prisma.like.findUnique({
          where: {
            postId_userId: {
              postId: parseInt(id),
              userId
            }
          }
        });

        if (existingLike) {
          // Unlike
          await req.prisma.like.delete({
            where: { id: existingLike.id }
          });
          res.json({ message: 'Post unliked', liked: false });
        } else {
          // Like
          await req.prisma.like.create({
            data: {
              postId: parseInt(id),
              userId
            }
          });
          res.json({ message: 'Post liked', liked: true });
        }

  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ error: 'Failed to like post' });
  }
});

/**
 * POST /api/social/posts/:id/comments
 * Add a comment to a post
 */
router.post('/posts/:id/comments', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const comment = await req.prisma.comment.create({
      data: {
        content,
        userId: req.user.id,
        postId: parseInt(id)
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

    res.status(201).json({
      message: 'Comment added successfully',
      comment
    });

  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

/**
 * GET /api/social/posts/:id/comments
 * Get all comments for a post
 */
router.get('/posts/:id/comments', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const comments = await req.prisma.comment.findMany({
      where: { postId: parseInt(id) },
      skip: parseInt(skip),
      take: parseInt(limit),
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
      orderBy: { createdAt: 'desc' }
    });

    const total = await req.prisma.comment.count({
      where: { postId: parseInt(id) }
    });

    res.json({
      comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Failed to get comments' });
  }
});

/**
 * POST /api/social/follow/:userId
 * Follow or unfollow a user
 */
router.post('/follow/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const followerId = req.user.id;

    if (parseInt(userId) === followerId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check if already following
    const existingFollow = await req.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: parseInt(userId)
        }
      }
    });

    if (existingFollow) {
      // Unfollow
      await req.prisma.follow.delete({
        where: { id: existingFollow.id }
      });
      res.json({ message: 'User unfollowed', following: false });
    } else {
      // Follow
      await req.prisma.follow.create({
        data: {
          followerId,
          followingId: parseInt(userId)
        }
      });
      res.json({ message: 'User followed', following: true });
    }

  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

/**
 * GET /api/social/users/search
 * Search for users
 */
router.get('/users/search', authMiddleware, async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const users = await req.prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { fullName: { contains: q, mode: 'insensitive' } },
          { 
            developerProfile: {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { company: { contains: q, mode: 'insensitive' } },
                { skills: { has: q } }
              ]
            }
          }
        ]
      },
      skip: parseInt(skip),
      take: parseInt(limit),
      select: {
        id: true,
        username: true,
        fullName: true,
        profilePicture: true,
        developerProfile: {
          select: {
            jobTitle: true,
            company: true,
            skills: true
          }
        },
        _count: {
          select: {
            followers: true,
            following: true,
            posts: true
          }
        }
      }
    });

    res.json({ users });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

/**
 * GET /api/social/profile/:username
 * Get user profile with social data
 */
router.get('/profile/:username', authMiddleware, async (req, res) => {
  try {
    const { username } = req.params;
    const currentUserId = req.user.id;

    const user = await req.prisma.user.findUnique({
      where: { username },
      include: {
        developerProfile: true,
        posts: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: { likes: true, comments: true }
            }
          }
        },
        _count: {
          select: {
            followers: true,
            following: true,
            posts: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if current user is following this user
    const isFollowing = await req.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: user.id
        }
      }
    });

    res.json({
      user: {
        ...user,
        isFollowing: !!isFollowing
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

/**
 * GET /api/social/developers
 * Get developers for discovery page
 */
router.get('/developers', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      location = '', 
      skills = '', 
      experience = '', 
      company = '',
      sortBy = 'relevance' 
    } = req.query;
    
    const skip = (page - 1) * limit;
    
    let whereClause = {
      id: {
        not: 1 // Exclude system user
      },
      developerProfile: {
        isPublic: true
      }
    };

    // Add search filters
    if (search) {
      whereClause.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { developerProfile: { bio: { contains: search, mode: 'insensitive' } } }
      ];
    }

    if (location) {
      whereClause.developerProfile.location = {
        contains: location,
        mode: 'insensitive'
      };
    }

    if (company) {
      whereClause.developerProfile.company = {
        contains: company,
        mode: 'insensitive'
      };
    }

    if (skills) {
      const skillArray = skills.split(',').map(s => s.trim());
      whereClause.developerProfile.skills = {
        hasSome: skillArray
      };
    }

    if (experience) {
      const [min, max] = experience.includes('-') 
        ? experience.split('-').map(Number)
        : experience === '10+' 
          ? [10, 999] 
          : [0, parseInt(experience)];
      
      whereClause.developerProfile.experience = {
        gte: min,
        lte: max === 999 ? undefined : max
      };
    }

    const users = await req.prisma.user.findMany({
      where: whereClause,
      take: parseInt(limit),
      skip: parseInt(skip),
      select: {
        id: true,
        username: true,
        fullName: true,
        profilePicture: true,
        bio: true,
        createdAt: true,
        developerProfile: {
          select: {
            bio: true,
            title: true,
            company: true,
            location: true,
            website: true,
            skills: true,
            experience: true,
            githubUrl: true,
            linkedinUrl: true,
            leetcodeId: true,
            codeforcesId: true
          }
        },
        _count: {
          select: {
            followers: true,
            posts: true
          }
        }
      },
      orderBy: sortBy === 'newest' 
        ? { createdAt: 'desc' }
        : [
            { followers: { _count: 'desc' } },
            { posts: { _count: 'desc' } },
            { createdAt: 'desc' }
          ]
    });

    // Add computed fields
    const developersWithStats = users.map(user => ({
      ...user,
      isOnline: false, // Placeholder for real-time status
      isVerified: user._count.followers > 100, // Simple verification logic
      profileData: user.developerProfile ? {
        ...user.developerProfile,
        reputation: Math.min(user._count.followers * 10 + user._count.posts * 5, 9999),
        primarySkills: user.developerProfile.skills?.slice(0, 5) || [],
        githubStars: 0, // Placeholder
        leetcodeRating: null, // Placeholder
        codeforcesRating: null, // Placeholder
        githubId: user.developerProfile.githubUrl?.split('/').pop(),
        linkedinId: user.developerProfile.linkedinUrl?.split('/').pop(),
        experienceYears: user.developerProfile.experience
      } : null
    }));

    res.json({
      developers: developersWithStats,
      hasMore: users.length === parseInt(limit),
      total: users.length
    });

  } catch (error) {
    console.error('Discover developers error:', error);
    res.status(500).json({ error: 'Failed to discover developers' });
  }
});

module.exports = router;