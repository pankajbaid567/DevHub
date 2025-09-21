const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { r2Client, upload } = require('../config/storage');
const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const router = express.Router();

/**
 * POST /api/recordings/upload
 * Upload meeting recording to Cloudflare R2
 */
router.post('/upload', authMiddleware, upload.single('recording'), async (req, res) => {
  try {
    const { sessionId, duration, participants } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No recording file provided' });
    }

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `recordings/${sessionId}/${timestamp}-${file.originalname}`;

    // Upload to Cloudflare R2
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        sessionId: sessionId.toString(),
        uploadedBy: req.user.id.toString(),
        duration: duration || '0',
        participants: participants || '1',
      },
    });

    await r2Client.send(uploadCommand);

    // Save recording metadata to database
    const recording = await req.prisma.recording.create({
      data: {
        sessionId: parseInt(sessionId),
        fileName,
        fileSize: file.size,
        duration: parseInt(duration) || 0,
        uploadedBy: req.user.id,
        participants: parseInt(participants) || 1,
        status: 'completed',
      },
    });

    res.json({
      message: 'Recording uploaded successfully',
      recording: {
        id: recording.id,
        fileName: recording.fileName,
        fileSize: recording.fileSize,
        duration: recording.duration,
        uploadedAt: recording.createdAt,
      },
    });

  } catch (error) {
    console.error('Recording upload error:', error);
    res.status(500).json({ error: 'Failed to upload recording' });
  }
});

/**
 * GET /api/recordings/session/:sessionId
 * Get all recordings for a session
 */
router.get('/session/:sessionId', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Check if user has access to this session
    const session = await req.prisma.session.findFirst({
      where: {
        id: parseInt(sessionId),
        OR: [
          { createdBy: req.user.id },
          { 
            participants: {
              some: { userId: req.user.id }
            }
          }
        ]
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found or access denied' });
    }

    const recordings = await req.prisma.recording.findMany({
      where: { sessionId: parseInt(sessionId) },
      orderBy: { createdAt: 'desc' },
      include: {
        uploader: {
          select: { id: true, fullName: true, email: true }
        }
      }
    });

    res.json({ recordings });

  } catch (error) {
    console.error('Get recordings error:', error);
    res.status(500).json({ error: 'Failed to get recordings' });
  }
});

/**
 * GET /api/recordings/:id/download
 * Get signed URL for downloading recording
 */
router.get('/:id/download', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const recording = await req.prisma.recording.findUnique({
      where: { id: parseInt(id) },
      include: {
        session: {
          include: {
            participants: true
          }
        }
      }
    });

    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    // Check if user has access to this recording
    const hasAccess = recording.session.createdBy === req.user.id ||
                     recording.session.participants.some(p => p.userId === req.user.id);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Generate signed URL for download
    const getCommand = new GetObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: recording.fileName,
    });

    const signedUrl = await getSignedUrl(r2Client, getCommand, { expiresIn: 3600 }); // 1 hour

    res.json({
      downloadUrl: signedUrl,
      fileName: recording.fileName,
      fileSize: recording.fileSize,
      duration: recording.duration,
    });

  } catch (error) {
    console.error('Generate download URL error:', error);
    res.status(500).json({ error: 'Failed to generate download URL' });
  }
});

/**
 * DELETE /api/recordings/:id
 * Delete a recording
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const recording = await req.prisma.recording.findUnique({
      where: { id: parseInt(id) },
      include: {
        session: true
      }
    });

    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    // Check if user is the session creator or recording uploader
    if (recording.session.createdBy !== req.user.id && recording.uploadedBy !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete from R2
    const deleteCommand = new DeleteObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: recording.fileName,
    });

    await r2Client.send(deleteCommand);

    // Delete from database
    await req.prisma.recording.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Recording deleted successfully' });

  } catch (error) {
    console.error('Delete recording error:', error);
    res.status(500).json({ error: 'Failed to delete recording' });
  }
});

module.exports = router;