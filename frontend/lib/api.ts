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
