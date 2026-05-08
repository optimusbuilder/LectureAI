import { describe, it, expect } from 'vitest';
import { createJob, updateJob, getJob, generateJobId } from '../lib/jobStore.js';

describe('jobStore', () => {
  describe('generateJobId', () => {
    it('generates unique IDs with job_ prefix', () => {
      const id1 = generateJobId();
      const id2 = generateJobId();
      expect(id1).toMatch(/^job_/);
      expect(id2).toMatch(/^job_/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('createJob / getJob', () => {
    it('creates a job with default fields', async () => {
      const jobId = generateJobId();
      await createJob(jobId, 'student');
      const job = await getJob(jobId);

      expect(job).toMatchObject({
        status: 'processing',
        step: 'Extracting transcript...',
        mode: 'student',
        result: null,
        error: null,
        videoMeta: null,
      });
    });

    it('returns undefined for non-existent job', async () => {
      expect(await getJob('nonexistent_id')).toBeUndefined();
    });
  });

  describe('updateJob', () => {
    it('merges updates into existing job', async () => {
      const jobId = generateJobId();
      await createJob(jobId, 'faculty');
      await updateJob(jobId, { step: 'Analyzing...', videoMeta: { title: 'Test' } });

      const job = await getJob(jobId);
      expect(job.step).toBe('Analyzing...');
      expect(job.videoMeta).toEqual({ title: 'Test' });
      expect(job.mode).toBe('faculty');
    });

    it('does nothing for non-existent job', async () => {
      await updateJob('fake_id', { step: 'nope' });
      expect(await getJob('fake_id')).toBeUndefined();
    });
  });
});
