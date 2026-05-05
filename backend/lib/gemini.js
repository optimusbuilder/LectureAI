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
      generationConfig: {
        maxOutputTokens: 8192,
      }
    };

    if (isJson) {
      config.generationConfig.responseMimeType = "application/json";
    }

    const model = genAI.getGenerativeModel(config);

    const result = await model.generateContent(userPrompt);
    const response = await result.response;
    let text = response.text().trim();

    if (!isJson) return text;

    // Secondary cleanup for JSON: extract everything between the first { or [ and the last } or ]
    if (isJson) {
      const firstCurly = text.indexOf('{');
      const firstSquare = text.indexOf('[');
      const lastCurly = text.lastIndexOf('}');
      const lastSquare = text.lastIndexOf(']');

      let startIndex = -1;
      let endIndex = -1;

      if (firstCurly !== -1 && (firstSquare === -1 || firstCurly < firstSquare)) {
        startIndex = firstCurly;
        endIndex = lastCurly;
      } else if (firstSquare !== -1) {
        startIndex = firstSquare;
        endIndex = lastSquare;
      }

      if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
        text = text.substring(startIndex, endIndex + 1);
      }
      
      try {
        return JSON.parse(text);
      } catch (parseError) {
        console.error('JSON Parse Error. Raw output:', text);
        throw new Error('FAILED_TO_PARSE_GEMINI_JSON');
      }
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
