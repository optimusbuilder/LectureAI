import express from 'express';
import { getJob } from '../lib/jobStore.js';
import { chatAgent } from '../agents/chatAgent.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { jobId, message, topicContext, history } = req.body || {};

  if (!jobId || !message || !topicContext) {
    return res.status(400).json({ error: 'jobId, message, and topicContext are required' });
  }

  try {
    const job = await getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const transcript = job.fullTranscript || '';

    if (!transcript) {
      return res.status(400).json({ error: 'No transcript data available for this job' });
    }

    const result = await chatAgent(message, topicContext, transcript, history || []);

    if (result.error) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Chat route error:', error);
    res.status(500).json({ error: 'Chat failed' });
  }
});

export default router;
