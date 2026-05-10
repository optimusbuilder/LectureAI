import express from 'express';
import { getJob } from '../lib/jobStore.js';
import { quizAgent } from '../agents/quizAgent.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { jobId, topicId, language } = req.body || {};

  if (!jobId) {
    return res.status(400).json({ error: 'jobId is required' });
  }

  try {
    const job = await getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (!job.intelligenceData || !job.fullTranscript) {
      return res.status(400).json({ error: 'Lecture data is not ready for quiz generation' });
    }

    const result = await quizAgent({
      intelligenceData: job.intelligenceData,
      fullTranscript: job.fullTranscript,
      targetLanguage: language || job.result?.language || 'en',
      topicId: topicId || 'all'
    });

    if (result.error) {
      return res.status(500).json(result);
    }

    const videoId = job.videoMeta?.videoId;
    if (videoId && result.questions) {
      result.questions = result.questions.map(question => ({
        ...question,
        youtubeLink: `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(question.timestamp || 0)}`
      }));
    }

    res.json(result);
  } catch (error) {
    console.error('Quiz route error:', error);
    res.status(500).json({ error: 'QUIZ_GENERATION_FAILED', message: error.message });
  }
});

export default router;
