const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * GET /api/users/profile
 * Get current user profile
 * Requires authentication
 */
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await req.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        bio: true,
        createdAt: true,
        _count: {
          select: {
            questions: true,
            answers: true,
            snippets: true,
            sessions: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      user: {
        ...user,
        counts: {
          questions: user._count.questions,
          answers: user._count.answers,
          snippets: user._count.snippets,
          sessions: user._count.sessions
        }
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

/**
 * GET /api/users/:id
 * Get user profile by ID with detailed counts
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await req.prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        username: true,
        email: true,
        bio: true,
        createdAt: true,
        _count: {
          select: {
            questions: true,
            answers: true,
            snippets: true,
            resumes: true,
            skillRatings: true,
            sessions: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      user: {
        ...user,
        counts: {
          questions: user._count.questions,
          answers: user._count.answers,
          snippets: user._count.snippets,
          resumes: user._count.resumes,
          skills: user._count.skillRatings,
          sessions: user._count.sessions
        }
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

/**
 * PUT /api/users/profile
 * Update current user profile
 * Requires authentication
 */
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { username, bio } = req.body;
    const userId = req.user.id;

    const updatedUser = await req.prisma.user.update({
      where: { id: userId },
      data: {
        ...(username && { username }),
        ...(bio !== undefined && { bio })
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        bio: true,
        createdAt: true
      }
    });

    res.json({ 
      message: 'Profile updated successfully',
      user: updatedUser 
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;