import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * High-level wrapper for Gemini 2.0 Flash
 */
export const getGeminiResponse = async (systemPrompt, userPrompt, isJson = true) => {
  try {
    const config = {
      model: "gemini-2.0-flash",
      systemInstruction: systemPrompt,
    };

    if (isJson) {
      config.generationConfig = {
        responseMimeType: "application/json",
      };
    }

    const model = genAI.getGenerativeModel(config);

    const result = await model.generateContent(userPrompt);
    const response = await result.response;
    let text = response.text().trim();

    if (!isJson) return text;

    // Secondary cleanup for JSON
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

/**
 * API Embedding using Google Gemini text-embedding-004 (768 dimensions)
 * Switched from local BAAI to prevent Railway memory limits from choking.
 */
export const getEmbedding = async (text) => {
  try {
    const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('Gemini Embedding Error:', error);
    throw error;
  }
};
