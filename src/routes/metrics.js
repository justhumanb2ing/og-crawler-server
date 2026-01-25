import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    uptimeSec: Math.round(process.uptime()),
    memory: process.memoryUsage()
  });
});

export default router;
