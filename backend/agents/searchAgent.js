import { searchChunks } from '../lib/pinecone.js';
import { getGeminiResponse } from '../lib/gemini.js';

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

/**
 * Analyze Chunk Agent
 * Responsibility: Explains how a specific chunk answers a query.
 */
export const analyzeChunkAgent = async (query, chunkText) => {
  const prompt = `
  User Question: "${query}"
  
  Transcript Segment:
  "${chunkText}"
  
  TASK:
  Based ONLY on the transcript segment above, explain how it answers the user's question. 
  Be concise (max 3 sentences). 
  If the segment doesn't directly answer it, explain why it is relevant to the topic.
  Use a friendly, helpful tone.
  `;

  try {
    const response = await getGeminiResponse(prompt, "You are a helpful study assistant.", false);
    return { analysis: response, error: null };
  } catch (error) {
    console.error('Analyze Chunk Agent Error:', error);
    return { error: 'ANALYSIS_FAILED', message: error.message };
  }
};
