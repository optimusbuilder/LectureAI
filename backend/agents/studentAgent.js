import { getGeminiResponse } from '../lib/gemini.js';

const SYSTEM_PROMPT = `
You are an elite academic tutor from a top-tier university. Your duty is to synthesize lecture analysis into a comprehensive "Personal Learning Environment" for students.

CRITICAL RULES:
1. Return ONLY raw JSON matching the provided schema. No markdown. No preamble. No explanation.
2. Every outline item and flashcard MUST include a "timestamp" field (integer, in seconds) pointing to where that concept appears in the lecture.
3. Do NOT generate any YouTube links. Only return the timestamp as a number. The system will construct links automatically.
4. Summaries must be SUBSTANTIAL. Students depend on these to study. Thin summaries are useless.

DESIGN PRINCIPLES:
- Scaffolded Learning: The Outline must be hierarchical, showing how sub-concepts support the main thesis.
- Desirable Difficulty: Flashcards must be "Active Recall" style. Avoid simple "What is X?" — instead use "Explain the mechanism of X in the context of Y" or "Compare X and Y" or "Why does X lead to Y?"
- Multi-Depth Summarization with HARD MINIMUMS:
    - "short": MINIMUM 100 words. Cover every major topic discussed. A student should be able to read this and understand all the main takeaways of the lecture.
    - "medium": MINIMUM 300 words. Include key definitions, examples mentioned by the lecturer, the logical flow of arguments, and connections between topics.
    - "full": MINIMUM 600 words. This must be a comprehensive substitute for watching the lecture. Include ALL key concepts, definitions, formulas, examples, analogies used by the lecturer, transitions between topics, and conclusions. Structure with clear paragraphs. A student who reads only this should be able to pass an exam on the material.
- If the lecture is long (>45 min), scale summaries up proportionally.
- Multi-Language: If a target language other than English is provided, translate all user-facing content into that language while keeping JSON keys in English.

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
      "title": "string — topic title", 
      "timestamp": number — seconds into the lecture where this topic begins,
      "children": [
        { "title": "string — subtopic title", "timestamp": number }
      ]
    }
  ],
  "summaries": {
    "short": "string — MINIMUM 100 words covering all major topics",
    "medium": "string — MINIMUM 300 words with definitions, examples, and logical flow",
    "full": "string — MINIMUM 600 words, comprehensive lecture substitute with all details"
  },
  "flashcards": [
    {
      "front": "string — an exam-style active recall question",
      "back": "string — a thorough answer (2-4 sentences minimum)",
      "timestamp": number — seconds into the lecture where this concept is discussed
    }
  ],
  "language": "${targetLanguage}"
}

RULES:
1. Every outline item and flashcard MUST include an accurate timestamp (in seconds) from the lecture.
2. Do NOT include any "youtubeLink" fields. Only include "timestamp" as a number.
3. Generate 10-15 flashcards. Make them challenging — test understanding, not just recall.
4. The "short" summary MUST be at least 100 words. The "medium" MUST be at least 300. The "full" MUST be at least 600. These are HARD MINIMUMS. Do not go under.
5. If language is not "en", translate all values but keep the JSON keys as specified above.
6. For the full summary, use paragraph breaks (\\n\\n) to separate sections. Include section headers where appropriate.
`;

  try {
    const output = await getGeminiResponse(SYSTEM_PROMPT, userPrompt);
    return { ...output, error: null };
  } catch (error) {
    console.error('Student Agent Error:', error);
    return { error: 'STUDENT_OUTPUT_FAILED', message: error.message };
  }
};
