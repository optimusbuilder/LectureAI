import express from 'express';
import { getJob } from '../lib/jobStore.js';

const router = express.Router();

router.get('/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const job = await getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json({ jobId, ...job });
});

export default router;
