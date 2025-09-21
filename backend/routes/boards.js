const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * GET /api/boards
 * Get user's collaborative boards
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { type = 'my-boards', limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    let whereClause = {};

    if (type === 'public') {
      whereClause = { isPublic: true };
    } else {
      // Get boards created by user or where they are collaborators
      whereClause = {
        OR: [
          { createdBy: req.user.id },
          { collaborators: { some: { userId: req.user.id } } }
        ]
      };
    }

    const boards = await req.prisma.collaborativeBoard.findMany({
      where: whereClause,
      skip: parseInt(skip),
      take: parseInt(limit),
      include: {
        creator: {
          select: { id: true, fullName: true, username: true }
        },
        collaborators: {
          include: {
            user: {
              select: { id: true, fullName: true, username: true }
            }
          }
        },
        _count: {
          select: { collaborators: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const total = await req.prisma.collaborativeBoard.count({ where: whereClause });

    res.json({
      boards,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get boards error:', error);
    res.status(500).json({ error: 'Failed to get boards' });
  }
});

/**
 * POST /api/boards
 * Create a new collaborative board
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, isPublic } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Board name is required' });
    }

    const board = await req.prisma.collaborativeBoard.create({
      data: {
        name,
        description,
        isPublic: isPublic || false,
        boardData: {}, // Empty canvas initially
        createdBy: req.user.id,
      },
      include: {
        creator: {
          select: { id: true, fullName: true, username: true }
        }
      }
    });

    // Add creator as admin collaborator
    await req.prisma.boardCollaborator.create({
      data: {
        boardId: board.id,
        userId: req.user.id,
        role: 'admin'
      }
    });

    res.status(201).json({
      message: 'Board created successfully',
      board
    });

  } catch (error) {
    console.error('Create board error:', error);
    res.status(500).json({ error: 'Failed to create board' });
  }
});

/**
 * GET /api/boards/:id
 * Get board details with full canvas data
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const board = await req.prisma.collaborativeBoard.findUnique({
      where: { id: parseInt(id) },
      include: {
        creator: {
          select: { id: true, fullName: true, username: true }
        },
        collaborators: {
          include: {
            user: {
              select: { id: true, fullName: true, username: true }
            }
          }
        }
      }
    });

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    // Check if user has access to this board
    const isCollaborator = board.collaborators.some(c => c.userId === req.user.id);
    const isCreator = board.createdBy === req.user.id;

    if (!board.isPublic && !isCollaborator && !isCreator) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ board });

  } catch (error) {
    console.error('Get board error:', error);
    res.status(500).json({ error: 'Failed to get board' });
  }
});

/**
 * PUT /api/boards/:id
 * Update board data (canvas state)
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { boardData, name, description } = req.body;

    // Check if user has access to edit this board
    const board = await req.prisma.collaborativeBoard.findUnique({
      where: { id: parseInt(id) },
      include: {
        collaborators: {
          where: { userId: req.user.id }
        }
      }
    });

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const userCollaborator = board.collaborators[0];
    const canEdit = board.createdBy === req.user.id || 
                   (userCollaborator && ['admin', 'editor'].includes(userCollaborator.role));

    if (!canEdit) {
      return res.status(403).json({ error: 'You do not have permission to edit this board' });
    }

    const updateData = {};
    if (boardData !== undefined) updateData.boardData = boardData;
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    const updatedBoard = await req.prisma.collaborativeBoard.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        creator: {
          select: { id: true, fullName: true, username: true }
        }
      }
    });

    res.json({
      message: 'Board updated successfully',
      board: updatedBoard
    });

  } catch (error) {
    console.error('Update board error:', error);
    res.status(500).json({ error: 'Failed to update board' });
  }
});

/**
 * POST /api/boards/:id/collaborators
 * Add collaborator to board
 */
router.post('/:id/collaborators', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { userEmail, role = 'editor' } = req.body;

    if (!userEmail) {
      return res.status(400).json({ error: 'User email is required' });
    }

    // Check if current user is board admin
    const board = await req.prisma.collaborativeBoard.findUnique({
      where: { id: parseInt(id) },
      include: {
        collaborators: {
          where: { userId: req.user.id }
        }
      }
    });

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const userCollaborator = board.collaborators[0];
    const canManage = board.createdBy === req.user.id || 
                     (userCollaborator && userCollaborator.role === 'admin');

    if (!canManage) {
      return res.status(403).json({ error: 'You do not have permission to manage collaborators' });
    }

    // Find user to add
    const userToAdd = await req.prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!userToAdd) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is already a collaborator
    const existingCollaborator = await req.prisma.boardCollaborator.findUnique({
      where: {
        boardId_userId: {
          boardId: parseInt(id),
          userId: userToAdd.id
        }
      }
    });

    if (existingCollaborator) {
      return res.status(400).json({ error: 'User is already a collaborator' });
    }

    // Add collaborator
    await req.prisma.boardCollaborator.create({
      data: {
        boardId: parseInt(id),
        userId: userToAdd.id,
        role: role
      }
    });

    res.json({ message: 'Collaborator added successfully' });

  } catch (error) {
    console.error('Add collaborator error:', error);
    res.status(500).json({ error: 'Failed to add collaborator' });
  }
});

/**
 * DELETE /api/boards/:id
 * Delete a board
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const board = await req.prisma.collaborativeBoard.findUnique({
      where: { id: parseInt(id) }
    });

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    // Only creator can delete the board
    if (board.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Only the board creator can delete this board' });
    }

    // Delete collaborators first
    await req.prisma.boardCollaborator.deleteMany({
      where: { boardId: parseInt(id) }
    });

    // Delete board
    await req.prisma.collaborativeBoard.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Board deleted successfully' });

  } catch (error) {
    console.error('Delete board error:', error);
    res.status(500).json({ error: 'Failed to delete board' });
  }
});

module.exports = router;