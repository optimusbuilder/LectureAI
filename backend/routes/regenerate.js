import express from 'express';
import { getJob, updateJob } from '../lib/jobStore.js';
import { studentAgent } from '../agents/studentAgent.js';

const router = express.Router();

/**
 * POST /regenerate
 * Re-runs Agent 3 with a new language using stored intelligence data.
 * Returns the new student materials directly (not async/polling).
 */
router.post('/', async (req, res) => {
  const { jobId, language } = req.body;

  if (!jobId || !language) {
    return res.status(400).json({ error: 'jobId and language are required' });
  }

  const job = await getJob(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (!job.intelligenceData) {
    return res.status(400).json({ error: 'No intelligence data available for this job. Process the lecture first.' });
  }

  try {
    const result = await studentAgent(job.intelligenceData, language);

    if (result.error) {
      return res.status(500).json({ error: result.error, message: result.message });
    }

    // Post-process: inject correct YouTube links using stored videoId
    const vid = job.videoMeta?.videoId;
    if (vid) {
      const makeLink = (ts) => `https://www.youtube.com/watch?v=${vid}&t=${Math.floor(ts)}`;
      
      if (result.outline) {
        result.outline = result.outline.map(item => ({
          ...item,
          youtubeLink: makeLink(item.timestamp || 0),
          children: (item.children || []).map(child => ({
            ...child,
            youtubeLink: makeLink(child.timestamp || 0)
          }))
        }));
      }
      
      if (result.flashcards) {
        result.flashcards = result.flashcards.map(card => ({
          ...card,
          youtubeLink: makeLink(card.timestamp || 0)
        }));
      }
    }

    // Update stored result with the new language version
    await updateJob(jobId, { result });

    res.json(result);
  } catch (error) {
    console.error('Regenerate error:', error);
    res.status(500).json({ error: 'Failed to regenerate materials' });
  }
});

export default router;
