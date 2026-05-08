const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export async function startJob(youtubeUrl: string, mode: 'student' | 'faculty') {
  const res = await fetch(`${BACKEND}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ youtubeUrl, mode })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to start job');
  }
  return res.json(); // { jobId, status }
}

export async function pollJob(jobId: string) {
  const res = await fetch(`${BACKEND}/status/${jobId}`);
  if (!res.ok) {
    throw new Error('Failed to poll job status');
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
    throw new Error('Search failed');
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
    const error = await res.json();
    throw new Error(error.message || 'Failed to regenerate materials');
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
    throw new Error('Analysis failed');
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
    throw new Error('Failed to generate audio');
  }
  return res.blob();
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
    throw new Error('Chat failed');
  }
  return res.json();
}
