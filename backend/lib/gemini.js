import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const GEMINI_EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
const GEMINI_EMBEDDING_DIMENSIONS = 768;

const JSON_PARSE_PREVIEW_CHARS = 700;

const extractJsonCandidate = (text) => {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const firstCurly = trimmed.indexOf('{');
  const firstSquare = trimmed.indexOf('[');
  const lastCurly = trimmed.lastIndexOf('}');
  const lastSquare = trimmed.lastIndexOf(']');

  let startIndex = -1;
  let endIndex = -1;

  if (firstCurly !== -1 && (firstSquare === -1 || firstCurly < firstSquare)) {
    startIndex = firstCurly;
    endIndex = lastCurly;
  } else if (firstSquare !== -1) {
    startIndex = firstSquare;
    endIndex = lastSquare;
  }

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    return trimmed;
  }

  return trimmed.substring(startIndex, endIndex + 1);
};

const parseJsonResponse = (text) => JSON.parse(extractJsonCandidate(text));

const formatParseDiagnostics = (text, response, parseError) => ({
  finishReason: response?.candidates?.[0]?.finishReason,
  textLength: text.length,
  parseError: parseError.message,
  preview: text.slice(0, JSON_PARSE_PREVIEW_CHARS),
  tail: text.slice(-JSON_PARSE_PREVIEW_CHARS)
});

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
        temperature: isJson ? 0.2 : 0.7,
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

    const finishReason = response?.candidates?.[0]?.finishReason;
    if (finishReason === 'MAX_TOKENS') {
      console.error('Gemini JSON response was truncated:', formatParseDiagnostics(text, response, new Error('MAX_TOKENS')));
      throw new Error('GEMINI_OUTPUT_TRUNCATED');
    }

    try {
      return parseJsonResponse(text);
    } catch (parseError) {
      console.error('Gemini returned invalid JSON, attempting repair:', formatParseDiagnostics(text, response, parseError));

      const repairPrompt = `
The following model output was intended to be JSON but failed to parse.
Return ONLY corrected, valid JSON. Do not add markdown, comments, or explanations.

INVALID OUTPUT:
${text}
`;

      const repairResult = await model.generateContent(repairPrompt);
      const repairResponse = await repairResult.response;
      const repairedText = repairResponse.text().trim();

      try {
        return parseJsonResponse(repairedText);
      } catch (repairError) {
        console.error('Gemini JSON repair failed:', formatParseDiagnostics(repairedText, repairResponse, repairError));
        throw new Error('FAILED_TO_PARSE_GEMINI_JSON');
      }
    }
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
};

/**
 * API embedding using Gemini's current REST embedding endpoint.
 * Keeps output at 768 dimensions to match the existing Pinecone index.
 */
export const getEmbedding = async (text, taskType = 'RETRIEVAL_DOCUMENT') => {
  try {
    const modelName = GEMINI_EMBEDDING_MODEL.replace(/^models\//, '');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:embedContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        taskType,
        output_dimensionality: GEMINI_EMBEDDING_DIMENSIONS,
        content: {
          parts: [{ text }]
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini Embedding API Error:', {
        status: response.status,
        statusText: response.statusText,
        model: modelName,
        error: data.error
      });
      throw new Error('GEMINI_EMBEDDING_FAILED');
    }

    const values = data.embedding?.values || data.embeddings?.[0]?.values;
    if (!Array.isArray(values)) {
      console.error('Gemini Embedding API returned an unexpected response:', {
        model: modelName,
        keys: Object.keys(data)
      });
      throw new Error('GEMINI_EMBEDDING_INVALID_RESPONSE');
    }

    return values;
  } catch (error) {
    console.error('Gemini Embedding Error:', error);
    throw error;
  }
};
