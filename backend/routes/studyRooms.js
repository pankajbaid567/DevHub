const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * GET /api/study-rooms
 * Get all public study rooms or user's rooms
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { type, subject, limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    let whereClause = {};

    if (type === 'my-rooms') {
      // Get rooms created by user or where they are participants
      whereClause = {
        OR: [
          { createdBy: req.user.id },
          { participants: { some: { userId: req.user.id } } }
        ]
      };
    } else {
      // Get public rooms
      whereClause = { isPublic: true, isActive: true };
    }

    if (subject) {
      whereClause.subject = { contains: subject, mode: 'insensitive' };
    }

    const studyRooms = await req.prisma.studyRoom.findMany({
      where: whereClause,
      skip: parseInt(skip),
      take: parseInt(limit),
      include: {
        creator: {
          select: { id: true, fullName: true, username: true }
        },
        participants: {
          include: {
            user: {
              select: { id: true, fullName: true, username: true }
            }
          }
        },
        _count: {
          select: { participants: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const total = await req.prisma.studyRoom.count({ where: whereClause });

    res.json({
      studyRooms,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get study rooms error:', error);
    res.status(500).json({ error: 'Failed to get study rooms' });
  }
});

/**
 * POST /api/study-rooms
 * Create a new study room
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, subject, isPublic, maxCapacity } = req.body;

    if (!name || !subject) {
      return res.status(400).json({ error: 'Name and subject are required' });
    }

    // Generate invite code for private rooms
    const inviteCode = !isPublic ? Math.random().toString(36).substring(2, 8).toUpperCase() : null;

    const studyRoom = await req.prisma.studyRoom.create({
      data: {
        name,
        description,
        subject,
        isPublic: isPublic !== false, // Default to public
        maxCapacity: maxCapacity || 10,
        inviteCode,
        createdBy: req.user.id,
      },
      include: {
        creator: {
          select: { id: true, fullName: true, username: true }
        }
      }
    });

    // Add creator as first participant
    await req.prisma.studyRoomParticipant.create({
      data: {
        studyRoomId: studyRoom.id,
        userId: req.user.id,
        role: 'moderator'
      }
    });

    res.status(201).json({
      message: 'Study room created successfully',
      studyRoom
    });

  } catch (error) {
    console.error('Create study room error:', error);
    res.status(500).json({ error: 'Failed to create study room' });
  }
});

/**
 * POST /api/study-rooms/:id/join
 * Join a study room
 */
router.post('/:id/join', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { inviteCode } = req.body;

    const studyRoom = await req.prisma.studyRoom.findUnique({
      where: { id: parseInt(id) },
      include: {
        participants: true
      }
    });

    if (!studyRoom) {
      return res.status(404).json({ error: 'Study room not found' });
    }

    if (!studyRoom.isActive) {
      return res.status(400).json({ error: 'Study room is not active' });
    }

    // Check if room is private and invite code is required
    if (!studyRoom.isPublic && studyRoom.inviteCode !== inviteCode) {
      return res.status(400).json({ error: 'Invalid invite code' });
    }

    // Check if user is already a participant; if so, return success instead of error to allow rejoin UX
    const existingParticipant = studyRoom.participants.find(p => p.userId === req.user.id);
    if (existingParticipant) {
      console.log(`StudyRoom join: user ${req.user.id} already participant of room ${id}`);
      return res.json({ message: 'Already a participant', alreadyMember: true });
    }

    // Check room capacity
    if (studyRoom.participants.length >= studyRoom.maxCapacity) {
      return res.status(400).json({ error: 'Study room is full' });
    }

    // Add user as participant
    await req.prisma.studyRoomParticipant.create({
      data: {
        studyRoomId: parseInt(id),
        userId: req.user.id,
        role: 'participant'
      }
    });

    res.json({ message: 'Successfully joined study room', alreadyMember: false });

  } catch (error) {
    console.error('Join study room error:', error);
    res.status(500).json({ error: 'Failed to join study room' });
  }
});

/**
 * POST /api/study-rooms/:id/leave
 * Leave a study room
 */
router.post('/:id/leave', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const participant = await req.prisma.studyRoomParticipant.findFirst({
      where: {
        studyRoomId: parseInt(id),
        userId: req.user.id
      }
    });

    if (!participant) {
      return res.status(404).json({ error: 'You are not a member of this room' });
    }

    await req.prisma.studyRoomParticipant.delete({
      where: { id: participant.id }
    });

    res.json({ message: 'Successfully left study room' });

  } catch (error) {
    console.error('Leave study room error:', error);
    res.status(500).json({ error: 'Failed to leave study room' });
  }
});

/**
 * GET /api/study-rooms/:id
 * Get study room details
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const studyRoom = await req.prisma.studyRoom.findUnique({
      where: { id: parseInt(id) },
      include: {
        creator: {
          select: { id: true, fullName: true, username: true }
        },
        participants: {
          include: {
            user: {
              select: { id: true, fullName: true, username: true }
            }
          }
        },
        sessions: {
          where: { status: 'live' },
          include: {
            hostUser: {
              select: { id: true, fullName: true, username: true }
            }
          }
        }
      }
    });

    if (!studyRoom) {
      return res.status(404).json({ error: 'Study room not found' });
    }

    // Check if user has access to this room
    const isParticipant = studyRoom.participants.some(p => p.userId === req.user.id);
    const isCreator = studyRoom.createdBy === req.user.id;

    if (!studyRoom.isPublic && !isParticipant && !isCreator) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ studyRoom });

  } catch (error) {
    console.error('Get study room error:', error);
    res.status(500).json({ error: 'Failed to get study room' });
  }
});

module.exports = router;