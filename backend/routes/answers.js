const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * POST /api/answers
 * Create an answer for a question
 * Requires authentication
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { body, questionId } = req.body;
    const userId = req.user.id;

    if (!body || !questionId) {
      return res.status(400).json({ error: 'Body and questionId are required' });
    }

    // Check if question exists
    const question = await req.prisma.question.findUnique({
      where: { id: parseInt(questionId) }
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const answer = await req.prisma.answer.create({
      data: {
        body,
        questionId: parseInt(questionId),
        userId
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true
          }
        },
        question: {
          select: {
            id: true,
            title: true
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

/**
 * GET /api/answers/question/:questionId
 * Get all answers for a specific question
 */
router.get('/question/:questionId', async (req, res) => {
  try {
    const { questionId } = req.params;

    const answers = await req.prisma.answer.findMany({
      where: { questionId: parseInt(questionId) },
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
    });

    res.json({ answers });
  } catch (error) {
    console.error('Get question answers error:', error);
    res.status(500).json({ error: 'Failed to get answers' });
  }
});

/**
 * GET /api/answers/user/:userId
 * Get answers by user ID
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const answers = await req.prisma.answer.findMany({
      where: { userId: parseInt(userId) },
      include: {
        question: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    res.json({ answers });
  } catch (error) {
    console.error('Get user answers error:', error);
    res.status(500).json({ error: 'Failed to get answers' });
  }
});

module.exports = router;