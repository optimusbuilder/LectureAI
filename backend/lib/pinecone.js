import { Pinecone } from '@pinecone-database/pinecone';
import { getEmbedding } from './gemini.js';
import dotenv from 'dotenv';

dotenv.config();

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});

const index = pc.index(process.env.PINECONE_INDEX_NAME || 'lecture-ai');

/**
 * Upserts lecture chunks into Pinecone
 * @param {string} videoId 
 * @param {Array} chunks 
 */
export const upsertChunks = async (videoId, chunks) => {
  console.log(`Indexing ${chunks.length} chunks for video ${videoId}...`);
  
  const vectors = await Promise.all(chunks.map(async (chunk) => {
    const values = await getEmbedding(chunk.text);
    return {
      id: `${videoId}_${chunk.id}`,
      values,
      metadata: {
        videoId,
        text: chunk.text,
        startTime: chunk.startTime,
        endTime: chunk.endTime
      }
    };
  }));

  // Batch upsert (max 100 per call recommended)
  for (let i = 0; i < vectors.length; i += 100) {
    const batch = vectors.slice(i, i + 100);
    await index.upsert(batch);
  }
  
  console.log('Indexing complete.');
};

/**
 * Searches for relevant moments in a lecture
 * @param {string} videoId 
 * @param {string} query 
 * @param {number} topK 
 */
export const searchChunks = async (videoId, query, topK = 3) => {
  const queryVector = await getEmbedding(query);
  
  const queryResponse = await index.query({
    vector: queryVector,
    filter: { videoId: { '$eq': videoId } },
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
