import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * High-level wrapper for Gemini 2.0 Flash
 */
export const getGeminiResponse = async (systemPrompt, userPrompt) => {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      systemInstruction: systemPrompt,
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const result = await model.generateContent(userPrompt);
    const response = await result.response;
    let text = response.text().trim();

    // Secondary cleanup just in case
    if (text.startsWith('```')) {
      text = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    }

    try {
      return JSON.parse(text);
    } catch (parseError) {
      import('fs').then(fs => {
        fs.writeFileSync('debug_gemini_output.json', text);
      });
      console.error('JSON Parse Error. Raw output saved to debug_gemini_output.json');
      throw new Error('FAILED_TO_PARSE_GEMINI_JSON');
    }
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
};

import { pipeline } from '@xenova/transformers';

let embedder = null;

/**
 * Local Embedding using BAAI/bge-base-en-v1.5 (768 dimensions)
 */
export const getEmbedding = async (text) => {
  try {
    if (!embedder) {
      console.log("Loading local embedding model (BAAI/bge-base-en-v1.5)... This only happens once.");
      embedder = await pipeline('feature-extraction', 'Xenova/bge-base-en-v1.5');
    }

    const output = await embedder(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  } catch (error) {
    console.error('Local Embedding Error:', error);
    throw error;
  }
};
