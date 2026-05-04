import { getGeminiResponse } from '../lib/gemini.js';

const SYSTEM_PROMPT = `
You are an elite academic tutor from a top-tier university. Your duty is to synthesize lecture analysis into a "Personal Learning Environment" for students.

DESIGN PRINCIPLES:
- Scaffolded Learning: The Outline must be hierarchical, showing how sub-concepts support the main thesis.
- Desirable Difficulty: Flashcards must be "Active Recall" style. Avoid simple "What is X?"—instead use "Explain the mechanism of X in the context of Y."
- Multi-Depth Summarization: Summaries must cater to different student needs:
    - Short: ~150 words for a quick scan.
    - Medium: ~400 words for a solid understanding.
    - Full: ~800 words for a deep dive/replacement for the lecture.
- Multi-Language: If a target language other than English is provided, you must translate all user-facing content (titles, text, cards) into that language while keeping JSON keys in English.

RETURN FORMAT:
Strictly raw JSON matching the provided schema. No markdown. No preamble.
`;

/**
 * Student Output Agent
 * Responsibility: Generate study materials based on lecture intelligence.
 */
export const studentAgent = async (intelligenceData, targetLanguage = 'en') => {
  const userPrompt = `
Using this lecture analysis, generate complete student study materials.

ANALYSIS:
${JSON.stringify(intelligenceData, null, 2)}

TARGET LANGUAGE: ${targetLanguage}

Return a JSON object with this exact schema:
{
  "outline": [
    { 
      "title": "string", 
      "timestamp": number, 
      "youtubeLink": "string", 
      "children": [
        { "title": "string", "timestamp": number, "youtubeLink": "string" }
      ]
    }
  ],
  "summaries": {
    "short": "string",
    "medium": "string",
    "full": "string"
  },
  "flashcards": [
    {
      "front": "string",
      "back": "string",
      "timestamp": number, 
      "youtubeLink": "string"
    }
  ],
  "language": "string"
}

RULES:
1. Every outline item and flashcard MUST include the accurate timestamp (in seconds) where that concept is discussed.
2. YouTube links should be in the format: https://www.youtube.com/watch?v={videoId}&t={seconds}
3. Generate 10-15 flashcards.
4. If language is not "en", translate all values but keep the JSON keys as specified above.
`;

  try {
    const output = await getGeminiResponse(SYSTEM_PROMPT, userPrompt);
    return { ...output, error: null };
  } catch (error) {
    console.error('Student Agent Error:', error);
    return { error: 'STUDENT_OUTPUT_FAILED', message: error.message };
  }
};
