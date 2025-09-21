const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * GET /api/profile
 * Get current user's developer profile
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const profile = await req.prisma.developerProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
            profilePicture: true,
            createdAt: true
          }
        }
      }
    });

    if (!profile) {
      // Create default profile if doesn't exist
      const newProfile = await req.prisma.developerProfile.create({
        data: {
          userId,
          isPublic: true,
          skills: []
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              email: true,
              profilePicture: true,
              createdAt: true
            }
          }
        }
      });
      return res.json({ profile: newProfile });
    }

    res.json({ profile });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

/**
 * PUT /api/profile
 * Update developer profile
 */
router.put('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      bio,
      jobTitle,
      company,
      location,
      website,
      githubUsername,
      linkedinUsername,
      leetcodeUsername,
      codechefUsername,
      codeforcesUsername,
      hackerrankUsername,
      skills,
      achievements,
      isPublic,
      availability
    } = req.body;

    const profile = await req.prisma.developerProfile.upsert({
      where: { userId },
      update: {
        bio,
        jobTitle,
        company,
        location,
        website,
        githubUsername,
        linkedinUsername,
        leetcodeUsername,
        codechefUsername,
        codeforcesUsername,
        hackerrankUsername,
        skills: skills || [],
        achievements: achievements || [],
        isPublic: isPublic !== undefined ? isPublic : true,
        availability
      },
      create: {
        userId,
        bio,
        jobTitle,
        company,
        location,
        website,
        githubUsername,
        linkedinUsername,
        leetcodeUsername,
        codechefUsername,
        codeforcesUsername,
        hackerrankUsername,
        skills: skills || [],
        achievements: achievements || [],
        isPublic: isPublic !== undefined ? isPublic : true,
        availability
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
            profilePicture: true
          }
        }
      }
    });

    res.json({
      message: 'Profile updated successfully',
      profile
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * GET /api/profile/stats
 * Get profile statistics
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await req.prisma.user.findUnique({
      where: { id: userId },
      select: {
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
            sessions: true,
            createdStudyRooms: true,
            createdBoards: true
          }
        }
      }
    });

    // Get additional stats
    const postLikes = await req.prisma.like.count({
      where: {
        post: {
          authorId: userId
        }
      }
    });

    const postComments = await req.prisma.comment.count({
      where: {
        post: {
          authorId: userId
        }
      }
    });

    res.json({
      stats: {
        posts: stats._count.posts,
        followers: stats._count.followers,
        following: stats._count.following,
        sessions: stats._count.sessions,
        studyRooms: stats._count.createdStudyRooms,
        boards: stats._count.createdBoards,
        totalLikes: postLikes,
        totalComments: postComments
      }
    });

  } catch (error) {
    console.error('Get profile stats error:', error);
    res.status(500).json({ error: 'Failed to get profile stats' });
  }
});

/**
 * POST /api/profile/achievements
 * Add achievement to profile
 */
router.post('/achievements', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, date, url } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Achievement title is required' });
    }

    const profile = await req.prisma.developerProfile.findUnique({
      where: { userId }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const newAchievement = {
      id: Date.now().toString(),
      title,
      description,
      date: date || new Date().toISOString(),
      url
    };

    const updatedProfile = await req.prisma.developerProfile.update({
      where: { userId },
      data: {
        achievements: {
          push: newAchievement
        }
      }
    });

    res.json({
      message: 'Achievement added successfully',
      achievement: newAchievement
    });

  } catch (error) {
    console.error('Add achievement error:', error);
    res.status(500).json({ error: 'Failed to add achievement' });
  }
});

/**
 * GET /api/profile/public/:username
 * Get public developer profile by username
 */
router.get('/public/:username', async (req, res) => {
  try {
    const { username } = req.params;

    const user = await req.prisma.user.findUnique({
      where: { username },
      include: {
        developerProfile: true,
        posts: {
          where: { type: { in: ['project', 'achievement'] } },
          take: 6,
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

    if (!user || !user.developerProfile?.isPublic) {
      return res.status(404).json({ error: 'Profile not found or private' });
    }

    // Remove sensitive data
    const { password, email, ...publicUser } = user;

    res.json({ user: publicUser });

  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({ error: 'Failed to get public profile' });
  }
});

/**
 * GET /api/profile/discover
 * Discover new developers
 */
router.get('/discover', authMiddleware, async (req, res) => {
  try {
    const { skills, location, jobTitle, limit = 20 } = req.query;
    const currentUserId = req.user.id;

    let whereClause = {
      id: { not: currentUserId },
      developerProfile: {
        isPublic: true
      }
    };

    // Add filters
    if (skills) {
      const skillsArray = skills.split(',');
      whereClause.developerProfile.skills = {
        hasSome: skillsArray
      };
    }

    if (location) {
      whereClause.developerProfile.location = {
        contains: location,
        mode: 'insensitive'
      };
    }

    if (jobTitle) {
      whereClause.developerProfile.title = {
        contains: jobTitle,
        mode: 'insensitive'
      };
    }

    const users = await req.prisma.user.findMany({
      where: whereClause,
      take: parseInt(limit),
      select: {
        id: true,
        username: true,
        fullName: true,
        profilePicture: true,
        createdAt: true,
        developerProfile: {
          select: {
            bio: true,
            title: true,
            company: true,
            location: true,
            skills: true,
            githubUrl: true,
            website: true,
            linkedinUrl: true,
            experience: true
          }
        },
        _count: {
          select: {
            followers: true,
            posts: true
          }
        }
      },
      orderBy: [
        { followers: { _count: 'desc' } },
        { createdAt: 'desc' }
      ]
    });

    res.json({ users });

  } catch (error) {
    console.error('Discover users error:', error);
    res.status(500).json({ error: 'Failed to discover users' });
  }
});

module.exports = router;