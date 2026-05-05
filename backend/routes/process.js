import express from 'express';
import rateLimit from 'express-rate-limit';
import { generateJobId, createJob, updateJob } from '../lib/jobStore.js';

const router = express.Router();

const processLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,                   // 20 requests per hour max
  message: { error: 'Too many requests, please try again later.' }
});

router.post('/', processLimiter, async (req, res) => {
  const { youtubeUrl, mode } = req.body;

  if (!youtubeUrl) {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  const jobId = generateJobId();
  createJob(jobId, mode || 'student');

  // Start processing async
  processLecture(jobId, youtubeUrl, mode || 'student');

  res.json({ jobId, status: 'processing' });
});

import { ingestionAgent } from '../agents/ingestionAgent.js';
import { intelligenceAgent } from '../agents/intelligenceAgent.js';
import { studentAgent } from '../agents/studentAgent.js';
import { facultyAgent } from '../agents/facultyAgent.js';
import { upsertChunks } from '../lib/pinecone.js';

async function processLecture(jobId, url, mode) {
  try {
    // Step 1: Ingestion
    updateJob(jobId, { step: 'Extracting transcript...' });
    const ingestionData = await ingestionAgent(url);
    if (ingestionData.error) throw new Error(ingestionData.error);

    // Step 2: Content Intelligence
    updateJob(jobId, { step: 'Analyzing lecture content...', videoMeta: ingestionData });
    const intelligenceData = await intelligenceAgent(ingestionData);
    if (intelligenceData.error) throw new Error(intelligenceData.error);

    // Cache intelligence data for language regeneration
    updateJob(jobId, { intelligenceData });

    // Step 3: Mode-specific Output
    let result;
    if (mode === 'faculty') {
      updateJob(jobId, { step: 'Generating faculty report...' });
      result = await facultyAgent(intelligenceData, ingestionData);
    } else {
      updateJob(jobId, { step: 'Building your study materials...' });
      result = await studentAgent(intelligenceData);
      
      // Post-process: inject correct YouTube links using real videoId
      if (!result.error) {
        const vid = ingestionData.videoId;
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
    }
    
    if (result.error) throw new Error(result.error);

    // Step 4: Indexing for Search (last step)
    updateJob(jobId, { step: 'Indexing for semantic search...' });
    let searchAvailable = true;
    try {
      await upsertChunks(ingestionData.videoId, intelligenceData.chunks);
    } catch (indexError) {
      console.error(`Search indexing failed for job ${jobId}:`, indexError);
      searchAvailable = false;
      updateJob(jobId, {
        searchIndexError: indexError.message,
        searchAvailable: false
      });
    }

    // Completion
    updateJob(jobId, { 
      status: 'complete', 
      result,
      searchAvailable,
      videoMeta: {
        title: ingestionData.title,
        videoId: ingestionData.videoId,
        duration: ingestionData.duration,
        author: ingestionData.author,
        thumbnail: ingestionData.thumbnail
      }
    });

  } catch (error) {
    console.error(`Error processing job ${jobId}:`, error);
    updateJob(jobId, { 
      status: 'error', 
      errorCode: error.message,
      message: getErrorMessage(error.message) 
    });
  }
}

const getErrorMessage = (code) => {
  const errors = {
    'INVALID_URL': "That doesn't look like a valid YouTube URL.",
    'PRIVATE_VIDEO': "This video is private. Please use a public URL.",
    'LIVESTREAM': "Live streams aren't supported yet.",
    'NO_CAPTIONS': "This video has no captions available.",
    'TRANSCRIPT_ERROR': "We couldn't extract the transcript.",
    'ANALYSIS_FAILED': "Gemini failed to analyze the lecture.",
    'STUDENT_OUTPUT_FAILED': "Failed to generate study materials.",
    'FACULTY_AUDIT_FAILED': "Failed to generate faculty report.",
    'GEMINI_OUTPUT_TRUNCATED': "The lecture output was too large to generate in one pass. Try a shorter video while we tune this flow."
  };
  return errors[code] || "Something went wrong. Please try again.";
};

export default router;
