import express from 'express';
import { getJob } from '../lib/jobStore.js';

const router = express.Router();

router.get('/:jobId', async (req, res) => {
  const { jobId } = req.params;

  try {
    const job = await getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ jobId, ...job });
  } catch (error) {
    console.error('Status route error:', error);
    res.status(500).json({ error: 'STATUS_LOOKUP_FAILED', message: 'Failed to load job status' });
  }
});

export default router;
