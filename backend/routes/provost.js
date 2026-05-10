import express from 'express';
import rateLimit from 'express-rate-limit';
import { generateJobId, createJob, updateJob } from '../lib/jobStore.js';
import { ingestionAgent } from '../agents/ingestionAgent.js';
import { intelligenceAgent } from '../agents/intelligenceAgent.js';
import { provostAgent } from '../agents/provostAgent.js';

const router = express.Router();

const provostLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  message: { error: 'Too many curriculum map requests, please try again later.' }
});

const normalizeObjectives = (value) => {
  const rawObjectives = Array.isArray(value)
    ? value
    : String(value || '').split('\n');

  return rawObjectives
    .map(line => String(line).replace(/^\s*[-*\d.)]+\s*/, '').trim())
    .filter(Boolean);
};

const normalizeUrls = (urls) => {
  const rawUrls = Array.isArray(urls)
    ? urls.map(url => String(url).trim()).filter(Boolean)
    : String(urls || '')
      .split('\n')
      .map(url => url.trim())
      .filter(Boolean);

  return [...new Set(rawUrls)];
};

const normalizeStatus = (status, score) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'covered') return 'Covered';
  if (normalized === 'missing') return 'Missing';
  if (normalized === 'partial') return 'Partial';
  if (Number(score) >= 75) return 'Covered';
  if (Number(score) <= 15) return 'Missing';
  return 'Partial';
};

const normalizeScore = (value) => {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.min(100, Math.max(0, Math.round(score)));
};

const normalizeLectureIndex = (value, lectureCount) => {
  const index = Number(value);
  if (!Number.isInteger(index)) return -1;
  if (index >= 0 && index < lectureCount) return index;
  if (index >= 1 && index <= lectureCount) return index - 1;
  return -1;
};

const normalizeObjectiveIndex = (value, objectiveCount) => {
  const index = Number(value);
  if (!Number.isInteger(index)) return -1;
  if (index >= 0 && index < objectiveCount) return index;
  if (index >= 1 && index <= objectiveCount) return index - 1;
  return -1;
};

const normalizeProvostResult = (rawResult, { courseTitle, learningObjectives, lectures }) => {
  const safeResult = rawResult && typeof rawResult === 'object' ? rawResult : {};
  const lectureMatrix = Array.isArray(safeResult.lectureMatrix) ? safeResult.lectureMatrix : [];
  const objectiveCoverage = Array.isArray(safeResult.objectiveCoverage) ? safeResult.objectiveCoverage : [];

  const normalizedObjectiveCoverage = learningObjectives.map((objectiveText, objectiveIndex) => {
    const rawObjective = objectiveCoverage[objectiveIndex] || {};
    const coverageScore = normalizeScore(rawObjective.coverageScore);
    const evidence = Array.isArray(rawObjective.evidence) ? rawObjective.evidence : [];

    return {
      objective: rawObjective.objective || objectiveText,
      status: normalizeStatus(rawObjective.status, coverageScore),
      coverageScore,
      confidence: normalizeScore(rawObjective.confidence),
      summary: rawObjective.summary || 'No coverage summary was generated for this objective.',
      evidence: evidence
        .map(item => {
          const lectureIndex = normalizeLectureIndex(item?.lectureIndex, lectures.length);
          const lecture = lectures[lectureIndex];
          if (!lecture) return null;

          const timestamp = Math.max(0, Math.floor(Number(item.timestamp) || 0));
          return {
            ...item,
            lectureIndex,
            lectureTitle: item.lectureTitle || lecture.title,
            timestamp,
            videoId: lecture.videoId,
            youtubeLink: `https://www.youtube.com/watch?v=${lecture.videoId}&t=${timestamp}`
          };
        })
        .filter(Boolean),
      gap: rawObjective.gap || '',
      recommendedAction: rawObjective.recommendedAction || ''
    };
  });

  const normalizedLectureMatrix = lectures.map((lecture, lectureIndex) => {
    const rawLecture = lectureMatrix.find(item => normalizeLectureIndex(item?.lectureIndex, lectures.length) === lectureIndex) || {};
    const rawScores = Array.isArray(rawLecture.objectiveScores) ? rawLecture.objectiveScores : [];

    return {
      lectureIndex,
      lectureTitle: rawLecture.lectureTitle || lecture.title,
      objectiveScores: learningObjectives.map((_, objectiveIndex) => {
        const rawScore = rawScores.find(item => normalizeObjectiveIndex(item?.objectiveIndex, learningObjectives.length) === objectiveIndex);
        return {
          objectiveIndex,
          score: normalizeScore(rawScore?.score),
          rationale: rawScore?.rationale || ''
        };
      })
    };
  });

  return {
    ...safeResult,
    courseTitle: safeResult.courseTitle || courseTitle,
    courseSummary: safeResult.courseSummary || 'Curriculum coverage was mapped from the lectures that could be processed.',
    overallCoverageScore: normalizeScore(safeResult.overallCoverageScore),
    objectiveCoverage: normalizedObjectiveCoverage,
    lectureMatrix: normalizedLectureMatrix,
    underServedObjectives: Array.isArray(safeResult.underServedObjectives) ? safeResult.underServedObjectives : [],
    recommendations: Array.isArray(safeResult.recommendations) ? safeResult.recommendations : []
  };
};

router.post('/', provostLimiter, async (req, res) => {
  const { courseTitle, learningObjectives, youtubeUrls } = req.body || {};
  const normalizedCourseTitle = String(courseTitle || '').trim();
  const objectives = normalizeObjectives(learningObjectives);
  const urls = normalizeUrls(youtubeUrls);

  if (!normalizedCourseTitle) {
    return res.status(400).json({ error: 'Course title is required' });
  }

  if (objectives.length === 0) {
    return res.status(400).json({ error: 'At least one learning objective is required' });
  }

  if (urls.length < 2 || urls.length > 10) {
    return res.status(400).json({ error: 'Provide 2 to 10 public YouTube lecture URLs' });
  }

  try {
    const jobId = generateJobId();
    await createJob(jobId, 'provost');
    processCurriculumMap(jobId, {
      courseTitle: normalizedCourseTitle,
      learningObjectives: objectives,
      youtubeUrls: urls
    });

    res.json({ jobId, status: 'processing' });
  } catch (error) {
    console.error('Failed to create provost job:', error);
    res.status(500).json({ error: 'JOB_CREATE_FAILED', message: 'Failed to start curriculum map' });
  }
});

async function processCurriculumMap(jobId, { courseTitle, learningObjectives, youtubeUrls }) {
  const timing = {};
  const startTotal = Date.now();
  const lectures = [];
  const failedLectures = [];

  try {
    await updateJob(jobId, {
      step: 'Extracting transcript...',
      courseTitle,
      learningObjectives,
      totalLectures: youtubeUrls.length,
      processedLectures: 0
    });

    for (let i = 0; i < youtubeUrls.length; i++) {
      const url = youtubeUrls[i];
      const lectureNumber = i + 1;

      try {
        await updateJob(jobId, {
          step: `Processing lecture ${lectureNumber} of ${youtubeUrls.length}...`,
          processedLectures: i,
          currentLectureUrl: url
        });

        const ingestionData = await ingestionAgent(url);
        if (ingestionData.error) throw new Error(ingestionData.error);

        await updateJob(jobId, {
          videoMeta: {
            title: `${courseTitle}: ${lectureNumber}/${youtubeUrls.length}`,
            videoId: ingestionData.videoId,
            duration: ingestionData.duration,
            author: ingestionData.author,
            thumbnail: ingestionData.thumbnail
          }
        });

        const intelligenceData = await intelligenceAgent(ingestionData);
        if (intelligenceData.error) throw new Error(intelligenceData.error);

        lectures.push({
          url,
          videoId: ingestionData.videoId,
          title: ingestionData.title,
          author: ingestionData.author,
          duration: ingestionData.duration,
          thumbnail: ingestionData.thumbnail,
          intelligenceData
        });

        await updateJob(jobId, {
          processedLectures: lectureNumber,
          lectures: lectures.map(({ intelligenceData, ...lecture }) => ({
            ...lecture,
            topicCount: intelligenceData.topics?.length || 0
          })),
          failedLectures
        });
      } catch (error) {
        console.error(`[${jobId}] Lecture ${lectureNumber} failed:`, error.message);
        failedLectures.push({
          url,
          lectureIndex: i,
          errorCode: error.message
        });
        await updateJob(jobId, {
          processedLectures: lectureNumber,
          failedLectures
        });
      }
    }

    if (lectures.length === 0) {
      throw new Error('PROVOST_NO_LECTURES_PROCESSED');
    }

    await updateJob(jobId, { step: 'Mapping curriculum coverage...' });
    const t1 = Date.now();
    let result = await provostAgent({ courseTitle, learningObjectives, lectures });
    timing.provost = Date.now() - t1;

    if (result.error) throw new Error(result.error);
    result = normalizeProvostResult(result, { courseTitle, learningObjectives, lectures });

    timing.total = Date.now() - startTotal;

    await updateJob(jobId, {
      status: 'complete',
      step: 'Complete',
      result,
      timing,
      courseTitle,
      learningObjectives,
      lectures: lectures.map(({ intelligenceData, ...lecture }) => ({
        ...lecture,
        topics: intelligenceData.topics || [],
        overallSummary: intelligenceData.overallSummary
      })),
      failedLectures,
      videoMeta: {
        title: courseTitle,
        videoId: lectures[0]?.videoId,
        duration: lectures.reduce((sum, lecture) => sum + (lecture.duration || 0), 0),
        author: `${lectures.length} lecture${lectures.length === 1 ? '' : 's'} analyzed`,
        thumbnail: lectures[0]?.thumbnail || null
      }
    });
  } catch (error) {
    timing.total = Date.now() - startTotal;
    console.error(`[${jobId}] Provost pipeline failed:`, error.message);
    await updateJob(jobId, {
      status: 'error',
      errorCode: error.message,
      message: getProvostErrorMessage(error.message),
      timing,
      failedLectures
    });
  }
}

const getProvostErrorMessage = (code) => {
  const errors = {
    'PROVOST_NO_LECTURES_PROCESSED': 'None of the lecture URLs could be processed. Please check captions and public access.',
    'PROVOST_ANALYSIS_FAILED': 'Failed to map the lectures against the learning objectives.',
    'GEMINI_OUTPUT_TRUNCATED': 'The curriculum map was too large to generate in one pass. Try fewer lectures or shorter objectives.'
  };
  return errors[code] || 'Something went wrong while creating the curriculum map.';
};

export default router;
