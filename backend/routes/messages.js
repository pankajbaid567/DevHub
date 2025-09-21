const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * POST /api/messages
 * Send a message to a session
 * Requires authentication
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { content, sessionId } = req.body;
    const userId = req.user.id;

    if (!content || !sessionId) {
      return res.status(400).json({ error: 'Content and sessionId are required' });
    }

    // Check if session exists
    const session = await req.prisma.session.findUnique({
      where: { id: parseInt(sessionId) }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const message = await req.prisma.message.create({
      data: {
        content,
        sessionId: parseInt(sessionId),
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
        session: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * GET /api/messages/session/:sessionId
 * Get all messages for a session
 */
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const messages = await req.prisma.message.findMany({
      where: { sessionId: parseInt(sessionId) },
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
      },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    const total = await req.prisma.message.count({
      where: { sessionId: parseInt(sessionId) }
    });

    res.json({
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get session messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

/**
 * GET /api/messages/user/:userId
 * Get messages by user ID across all sessions
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const messages = await req.prisma.message.findMany({
      where: { userId: parseInt(userId) },
      include: {
        session: {
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

    res.json({ messages });
  } catch (error) {
    console.error('Get user messages error:', error);
    res.status(500).json({ error: 'Failed to get user messages' });
  }
});

module.exports = router;