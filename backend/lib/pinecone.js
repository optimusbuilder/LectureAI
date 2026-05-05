import { Pinecone } from '@pinecone-database/pinecone';
import { getEmbedding } from './gemini.js';
import dotenv from 'dotenv';

dotenv.config();

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});

const index = pc.index(process.env.PINECONE_INDEX_NAME || 'lecture-ai');

/**
 * Wipes all vectors for a specific video namespace
 * @param {string} videoId 
 */
export const clearNamespace = async (videoId) => {
  try {
    console.log(`Wiping namespace for video ${videoId}...`);
    const ns = index.namespace(videoId);
    await ns.deleteAll();
  } catch (error) {
    // If namespace doesn't exist, Pinecone might throw, which is fine
    console.log(`Namespace ${videoId} already clean or empty.`);
  }
};

/**
 * Upserts lecture chunks into Pinecone using Namespaces
 * @param {string} videoId 
 * @param {Array} chunks 
 */
export const upsertChunks = async (videoId, chunks) => {
  // First, ensure a fresh slate for this video
  await clearNamespace(videoId);
  
  console.log(`Indexing ${chunks.length} chunks into namespace ${videoId}...`);
  
  const ns = index.namespace(videoId);
  const vectors = [];
  
  for (const chunk of chunks) {
    const values = await getEmbedding(chunk.text);
    vectors.push({
      id: `${videoId}_${chunk.id}`,
      values,
      metadata: {
        videoId,
        text: chunk.text,
        startTime: chunk.startTime,
        endTime: chunk.endTime
      }
    });
    // Tiny delay to be safe with free tier rate limits
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // Batch upsert
  for (let i = 0; i < vectors.length; i += 100) {
    const batch = vectors.slice(i, i + 100);
    await ns.upsert(batch);
  }
  
  console.log('Indexing complete.');
};

/**
 * Searches for relevant moments within a specific video's namespace
 * @param {string} videoId 
 * @param {string} query 
 * @param {number} topK 
 */
export const searchChunks = async (videoId, query, topK = 3) => {
  const queryVector = await getEmbedding(query);
  const ns = index.namespace(videoId);
  
  const queryResponse = await ns.query({
    vector: queryVector,
    topK,
    includeMetadata: true
  });

  return queryResponse.matches.map(match => ({
    text: match.metadata.text,
    startTime: match.metadata.startTime,
    endTime: match.metadata.endTime,
    youtubeLink: `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(match.metadata.startTime)}`,
    score: match.score
  }));
};
