const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * POST /api/sessions
 * Create a new chat session
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      language = 'javascript',
      sessionType = 'live-coding',
      privacy = 'public',
      maxParticipants = 20,
      duration = 60,
      tags = [],
      scheduledFor,
      startNow = false
    } = req.body;
    const hostUserId = req.user.id;

    if (!title) {
      return res.status(400).json({ error: 'Session title is required' });
    }

    const sessionData = {
      title,
      description: description || '',
      language,
      sessionType,
      privacy,
      maxParticipants,
      duration,
      tags,
      hostUserId,
      status: startNow ? 'live' : (scheduledFor ? 'scheduled' : 'live'),
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      startedAt: startNow ? new Date() : null
    };

    const session = await req.prisma.session.create({
      data: sessionData,
      include: {
        hostUser: {
          select: {
            id: true,
            username: true,
            fullName: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Session created successfully',
      session
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

/**
 * GET /api/sessions
 * Get all sessions
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const sessions = await req.prisma.session.findMany({
      include: {
        hostUser: {
          select: {
            id: true,
            username: true,
            fullName: true
          }
        },
        _count: {
          select: {
            messages: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    const total = await req.prisma.session.count();

    res.json({
      sessions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

/**
 * GET /api/sessions/:id
 * Get session by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const session = await req.prisma.session.findUnique({
      where: { id: parseInt(id) },
      include: {
        hostUser: {
          select: {
            id: true,
            username: true,
            fullName: true
          }
        },
        messages: {
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

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ session });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

module.exports = router;
