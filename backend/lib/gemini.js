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

/**
 * Simple embedding wrapper using text-embedding-004
 */
export const getEmbedding = async (text) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
    const result = await model.embedContent({
      content: { parts: [{ text }] },
      taskType: "RETRIEVAL_DOCUMENT",
      outputDimensionality: 768
    });
    return result.embedding.values;
  } catch (error) {
    console.error('Embedding Error:', error);
    throw error;
  }
};
