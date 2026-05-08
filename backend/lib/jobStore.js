import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';

dotenv.config();

const JOB_TTL_SECONDS = 60 * 60 * 2; // 2 hours

let redis = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  console.log('Job store: Using Upstash Redis');
} else {
  console.log('Job store: Using in-memory fallback (set UPSTASH_REDIS_REST_URL to persist)');
}

const memoryStore = new Map();

export const createJob = async (jobId, mode) => {
  const job = {
    status: 'processing',
    step: 'Extracting transcript...',
    mode,
    result: null,
    error: null,
    videoMeta: null,
    createdAt: Date.now(),
  };

  if (redis) {
    await redis.set(`job:${jobId}`, JSON.stringify(job), { ex: JOB_TTL_SECONDS });
  } else {
    memoryStore.set(jobId, job);
  }
};

export const updateJob = async (jobId, updates) => {
  const currentJob = await getJob(jobId);
  if (!currentJob) return;

  const updated = { ...currentJob, ...updates };

  if (redis) {
    await redis.set(`job:${jobId}`, JSON.stringify(updated), { ex: JOB_TTL_SECONDS });
  } else {
    memoryStore.set(jobId, updated);
  }
};

export const getJob = async (jobId) => {
  if (redis) {
    const data = await redis.get(`job:${jobId}`);
    if (!data) return undefined;
    return typeof data === 'string' ? JSON.parse(data) : data;
  }
  return memoryStore.get(jobId);
};

export const generateJobId = () => "job_" + Date.now() + Math.random().toString(36).slice(2, 7);
