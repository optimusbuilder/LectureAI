import express from 'express';
import rateLimit from 'express-rate-limit';
import { generateJobId, createJob, updateJob } from '../lib/jobStore.js';

const router = express.Router();

const processLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 2,                        // 2 requests per 24 hours max
  message: { error: 'Daily limit reached. You can only analyze 2 videos per day.' }
});

router.post('/', processLimiter, async (req, res) => {
  const { youtubeUrl, mode } = req.body || {};
  const normalizedMode = mode || 'student';

  if (!youtubeUrl) {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  if (!['student', 'faculty'].includes(normalizedMode)) {
    return res.status(400).json({ error: 'Mode must be either student or faculty' });
  }

  try {
    const jobId = generateJobId();
    await createJob(jobId, normalizedMode);

    // Start processing async (not awaited — returns immediately)
    processLecture(jobId, youtubeUrl, normalizedMode);

    res.json({ jobId, status: 'processing' });
  } catch (error) {
    console.error('Failed to create processing job:', error);
    res.status(500).json({ error: 'JOB_CREATE_FAILED', message: 'Failed to start processing job' });
  }
});

import { ingestionAgent } from '../agents/ingestionAgent.js';
import { intelligenceAgent } from '../agents/intelligenceAgent.js';
import { studentAgent } from '../agents/studentAgent.js';
import { facultyAgent } from '../agents/facultyAgent.js';
import { upsertChunks } from '../lib/pinecone.js';

async function processLecture(jobId, url, mode) {
  const timing = {};
  const startTotal = Date.now();

  try {
    // Step 1: Ingestion
    await updateJob(jobId, { step: 'Extracting transcript...' });
    const t1 = Date.now();
    const ingestionData = await ingestionAgent(url);
    timing.ingestion = Date.now() - t1;
    if (ingestionData.error) throw new Error(ingestionData.error);

    console.log(`[${jobId}] Ingestion complete in ${timing.ingestion}ms — ${ingestionData.transcriptSegments?.length} segments`);

    // Step 2: Content Intelligence
    await updateJob(jobId, { step: 'Analyzing lecture content...', videoMeta: ingestionData });
    const t2 = Date.now();
    const intelligenceData = await intelligenceAgent(ingestionData);
    timing.intelligence = Date.now() - t2;
    if (intelligenceData.error) throw new Error(intelligenceData.error);

    console.log(`[${jobId}] Intelligence complete in ${timing.intelligence}ms — ${intelligenceData.topics?.length || 0} topics, ${intelligenceData.chunks?.length || 0} chunks`);

    // Cache intelligence data + transcript for language regeneration and chat
    await updateJob(jobId, { intelligenceData, fullTranscript: ingestionData.fullTranscript });

    // Step 3: Mode-specific Output
    let result;
    const t3 = Date.now();
    if (mode === 'faculty') {
      await updateJob(jobId, { step: 'Generating faculty report...' });
      result = await facultyAgent(intelligenceData, ingestionData);
    } else {
      await updateJob(jobId, { step: 'Building your study materials...' });
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
    timing.output = Date.now() - t3;
    
    if (result.error) throw new Error(result.error);

    console.log(`[${jobId}] ${mode === 'faculty' ? 'Faculty' : 'Student'} output complete in ${timing.output}ms`);

    // Step 4: Indexing for Search (last step)
    await updateJob(jobId, { step: 'Indexing for semantic search...' });
    const t4 = Date.now();
    let searchAvailable = true;
    try {
      await upsertChunks(ingestionData.videoId, intelligenceData.chunks);
    } catch (indexError) {
      console.error(`Search indexing failed for job ${jobId}:`, indexError);
      searchAvailable = false;
      await updateJob(jobId, {
        searchIndexError: indexError.message,
        searchAvailable: false
      });
    }
    timing.indexing = Date.now() - t4;
    timing.total = Date.now() - startTotal;

    console.log(`[${jobId}] Pipeline complete in ${timing.total}ms | ingestion=${timing.ingestion}ms intelligence=${timing.intelligence}ms output=${timing.output}ms indexing=${timing.indexing}ms`);

    // Completion
    await updateJob(jobId, { 
      status: 'complete', 
      result,
      searchAvailable,
      timing,
      videoMeta: {
        title: ingestionData.title,
        videoId: ingestionData.videoId,
        duration: ingestionData.duration,
        author: ingestionData.author,
        thumbnail: ingestionData.thumbnail
      }
    });

  } catch (error) {
    timing.total = Date.now() - startTotal;
    console.error(`[${jobId}] Pipeline failed in ${timing.total}ms:`, error.message);
    await updateJob(jobId, { 
      status: 'error', 
      errorCode: error.message,
      message: getErrorMessage(error.message),
      timing
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
