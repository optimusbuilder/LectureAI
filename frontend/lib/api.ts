const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

async function readErrorMessage(res: Response, fallback: string) {
  try {
    const error = await res.json();
    return error.message || error.error || fallback;
  } catch {
    return fallback;
  }
}

export async function startJob(youtubeUrl: string, mode: 'student' | 'faculty') {
  const res = await fetch(`${BACKEND}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ youtubeUrl, mode })
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, 'Failed to start job'));
  }
  return res.json(); // { jobId, status }
}

export async function startProvostJob(
  courseTitle: string,
  learningObjectives: string,
  youtubeUrls: string[]
) {
  const res = await fetch(`${BACKEND}/provost`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courseTitle, learningObjectives, youtubeUrls })
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, 'Failed to start curriculum map'));
  }
  return res.json();
}

export async function pollJob(jobId: string) {
  const res = await fetch(`${BACKEND}/status/${jobId}`);
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, 'Failed to poll job status'));
  }
  return res.json();
}

export async function searchLecture(query: string, videoId: string) {
  const res = await fetch(`${BACKEND}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, videoId })
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, 'Search failed'));
  }
  return res.json();
}

export async function regenerateStudentMaterials(jobId: string, language: string) {
  const res = await fetch(`${BACKEND}/regenerate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, language })
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, 'Failed to regenerate materials'));
  }
  return res.json();
}

export async function analyzeChunk(query: string, chunkText: string) {
  const res = await fetch(`${BACKEND}/search/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, chunkText })
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, 'Analysis failed'));
  }
  return res.json();
}

export async function getAudio(text: string) {
  const res = await fetch(`${BACKEND}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, 'Failed to generate audio'));
  }
  return res.blob();
}

export async function generateQuiz(jobId: string, topicId: string = 'all', language: string = 'en') {
  const res = await fetch(`${BACKEND}/quiz`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, topicId, language })
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, 'Failed to generate quiz'));
  }
  return res.json();
}

export async function chatWithTopic(
  jobId: string,
  message: string,
  topicContext: { title: string; startTime: number; endTime: number; summary: string; keyTerms: string[] },
  history: { role: 'user' | 'assistant'; content: string }[] = []
) {
  const res = await fetch(`${BACKEND}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, message, topicContext, history })
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, 'Chat failed'));
  }
  return res.json();
}
