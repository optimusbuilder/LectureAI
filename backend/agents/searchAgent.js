import { searchChunks } from '../lib/pinecone.js';

/**
 * Search Agent
 * Responsibility: Semantic search across a specific lecture.
 */
export const searchAgent = async (videoId, query) => {
  try {
    const results = await searchChunks(videoId, query);
    return { results, error: null };
  } catch (error) {
    console.error('Search Agent Error:', error);
    return { error: 'SEARCH_FAILED', message: error.message };
  }
};
