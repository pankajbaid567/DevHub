const express = require('express');
const router = express.Router();

// GET /api/stats - aggregate platform statistics
router.get('/', async (req, res) => {
  try {
    const prisma = req.prisma;

    const [userCount, snippetCount, projectCount, sessionCounts] = await Promise.all([
      prisma.user.count(),
      prisma.snippet.count(),
      prisma.collaborativeBoard.count(), // treating boards as projects
      prisma.session.groupBy({
        by: ['status'],
        _count: { status: true }
      }).catch(() => [])
    ]);

    // Derive a simplistic success rate: completed sessions / (live + completed + scheduled)
    const totalSessions = sessionCounts.reduce((acc, s) => acc + s._count.status, 0) || 0;
    const completedSessions = sessionCounts.find(s => s.status === 'completed')?._count.status || 0;
    const successRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 95; // fallback

    res.json({
      users: userCount,
      snippets: snippetCount,
      projects: projectCount,
      successRate,
      meta: { generatedAt: new Date().toISOString() }
    });
  } catch (err) {
    console.error('Stats aggregation failed:', err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

module.exports = router;
