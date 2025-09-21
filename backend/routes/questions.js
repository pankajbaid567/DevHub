const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * GET /api/questions
 * Get all questions with pagination
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, tags } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (tags) {
      where.tags = {
        hasSome: Array.isArray(tags) ? tags : [tags]
      };
    }

    const questions = await req.prisma.question.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true
          }
        },
        _count: {
          select: {
            answers: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    const total = await req.prisma.question.count({ where });

    res.json({
      questions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ error: 'Failed to get questions' });
  }
});

/**
 * GET /api/questions/:id
 * Get question by ID with answers
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const question = await req.prisma.question.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true
          }
        },
        answers: {
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
            createdAt: 'asc'
          }
        }
      }
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json({ question });
  } catch (error) {
    console.error('Get question error:', error);
    res.status(500).json({ error: 'Failed to get question' });
  }
});

/**
 * POST /api/questions
 * Create a new question
 * Requires authentication
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, body, tags = [] } = req.body;
    const userId = req.user.id;

    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
    }

    const question = await req.prisma.question.create({
      data: {
        title,
        body,
        tags,
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

    res.status(201).json({
      message: 'Question created successfully',
      question
    });
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({ error: 'Failed to create question' });
  }
});

/**
 * POST /api/questions/:id/answers
 * Create an answer for a specific question
 * Requires authentication
 */
router.post('/:id/answers', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Check if question exists
    const question = await req.prisma.question.findUnique({
      where: { id: parseInt(id) }
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const answer = await req.prisma.answer.create({
      data: {
        body: content,
        questionId: parseInt(id),
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

    res.status(201).json({
      message: 'Answer created successfully',
      answer
    });
  } catch (error) {
    console.error('Create answer error:', error);
    res.status(500).json({ error: 'Failed to create answer' });
  }
});

module.exports = router;