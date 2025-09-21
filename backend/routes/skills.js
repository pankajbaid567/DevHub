const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * GET /api/skills
 * Get all skills with pagination
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const skills = await req.prisma.skillRating.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true
          }
        }
      },
      orderBy: {
        rating: 'desc'
      },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    const total = await req.prisma.skillRating.count();

    res.json({
      skills,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get skills error:', error);
    res.status(500).json({ error: 'Failed to get skills' });
  }
});

/**
 * POST /api/skills
 * Add or update a skill rating
 * Requires authentication
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { skillName, rating } = req.body;
    const userId = req.user.id;

    if (!skillName || rating === undefined) {
      return res.status(400).json({ error: 'Skill name and rating are required' });
    }

    if (rating < 1 || rating > 10) {
      return res.status(400).json({ error: 'Rating must be between 1 and 10' });
    }

    // Check if skill already exists for user
    const existingSkill = await req.prisma.skillRating.findFirst({
      where: {
        userId,
        skillName
      }
    });

    let skill;
    if (existingSkill) {
      // Update existing skill
      skill = await req.prisma.skillRating.update({
        where: { id: existingSkill.id },
        data: { rating },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true
            }
          }
        }
      });
    } else {
      // Create new skill
      skill = await req.prisma.skillRating.create({
        data: {
          skillName,
          rating,
          userId
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true
            }
          }
        }
      });
    }

    res.status(201).json({
      message: 'Skill rating saved successfully',
      skill
    });
  } catch (error) {
    console.error('Save skill error:', error);
    res.status(500).json({ error: 'Failed to save skill rating' });
  }
});

/**
 * GET /api/skills/user/:userId
 * Get skills by user ID
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const skills = await req.prisma.skillRating.findMany({
      where: { userId: parseInt(userId) },
      orderBy: {
        rating: 'desc'
      }
    });

    res.json({ skills });
  } catch (error) {
    console.error('Get user skills error:', error);
    res.status(500).json({ error: 'Failed to get skills' });
  }
});

/**
 * DELETE /api/skills/:id
 * Delete a skill rating
 * Requires authentication
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const skill = await req.prisma.skillRating.findUnique({
      where: { id: parseInt(id) }
    });

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    if (skill.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this skill' });
    }

    await req.prisma.skillRating.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Skill deleted successfully' });
  } catch (error) {
    console.error('Delete skill error:', error);
    res.status(500).json({ error: 'Failed to delete skill' });
  }
});

module.exports = router;