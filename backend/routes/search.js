import express from 'express';

const router = express.Router();

import { searchAgent } from '../agents/searchAgent.js';

router.post('/', async (req, res) => {
  const { query, videoId } = req.body;

  if (!query || !videoId) {
    return res.status(400).json({ error: 'Query and videoId are required' });
  }

  const result = await searchAgent(videoId, query);
  
  if (result.error) {
    return res.status(500).json(result);
  }

  res.json(result);
});

export default router;
