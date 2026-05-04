// lib/jobStore.js
const jobs = new Map();

export const createJob = (jobId, mode) => {
  jobs.set(jobId, { 
    status: 'processing', 
    step: 'Extracting transcript...', 
    mode, 
    result: null, 
    error: null,
    videoMeta: null
  });
};

export const updateJob = (jobId, updates) => {
  const currentJob = jobs.get(jobId);
  if (currentJob) {
    jobs.set(jobId, { ...currentJob, ...updates });
  }
};

export const getJob = (jobId) => jobs.get(jobId);

export const generateJobId = () => "job_" + Date.now() + Math.random().toString(36).slice(2, 7);
