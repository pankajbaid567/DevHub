const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * GET /api/snippets
 * Get all snippets with pagination
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, language } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (language) {
      where.language = language;
    }

    const snippets = await req.prisma.snippet.findMany({
      where,
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
        createdAt: 'desc'
      },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    const total = await req.prisma.snippet.count({ where });

    res.json({
      snippets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get snippets error:', error);
    res.status(500).json({ error: 'Failed to get snippets' });
  }
});

/**
 * POST /api/snippets
 * Create a new code snippet
 * Requires authentication
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, code, language } = req.body;
    const userId = req.user.id;

    if (!title || !code || !language) {
      return res.status(400).json({ error: 'Title, code, and language are required' });
    }

    const snippet = await req.prisma.snippet.create({
      data: {
        title,
        code,
        language,
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
      message: 'Snippet created successfully',
      snippet
    });
  } catch (error) {
    console.error('Create snippet error:', error);
    res.status(500).json({ error: 'Failed to create snippet' });
  }
});

/**
 * GET /api/snippets/:id
 * Get snippet by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const snippet = await req.prisma.snippet.findUnique({
      where: { id: parseInt(id) },
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

    if (!snippet) {
      return res.status(404).json({ error: 'Snippet not found' });
    }

    res.json({ snippet });
  } catch (error) {
    console.error('Get snippet error:', error);
    res.status(500).json({ error: 'Failed to get snippet' });
  }
});

module.exports = router;