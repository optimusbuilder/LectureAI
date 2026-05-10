import { getGeminiResponse } from '../lib/gemini.js';

const SYSTEM_PROMPT = `
You are an expert assessment designer for a lecture learning platform.

Your task is to generate a fresh 10-question quiz from a lecture. The quiz should test real understanding, not memorization.

RULES:
1. Return ONLY raw JSON matching the schema. No markdown fences, no preamble.
2. Generate exactly 10 questions.
3. Use a mix of conceptual, application, comparison, and sequencing questions.
4. Every question must have exactly 4 answer choices.
5. "answerIndex" must be 0, 1, 2, or 3 and must point to the correct choice.
6. Every explanation should teach why the answer is correct in 1-3 sentences.
7. Every question must include a timestamp in seconds where the answer is supported by the lecture.
8. If a target language other than English is provided, translate user-facing strings while keeping JSON keys in English.
`;

const selectTopicContext = (intelligenceData, topicId) => {
  if (!topicId || topicId === 'all') return null;
  return (intelligenceData.topics || []).find((topic, index) => (
    topic.id === topicId || `topic_${index}` === topicId
  )) || null;
};

export const quizAgent = async ({ intelligenceData, fullTranscript, targetLanguage = 'en', topicId = 'all' }) => {
  const topic = selectTopicContext(intelligenceData, topicId);
  const quizSource = {
    overallSummary: intelligenceData.overallSummary,
    topics: topic ? [topic] : intelligenceData.topics,
    topicConnections: intelligenceData.topicConnections || [],
    pedagogicalSignals: intelligenceData.pedagogicalSignals || {}
  };

  const userPrompt = `
Generate a 10-question quiz for this lecture.

QUIZ SCOPE:
${topic ? `Only this topic: ${JSON.stringify(topic, null, 2)}` : 'The whole lecture'}

LECTURE ANALYSIS:
${JSON.stringify(quizSource, null, 2)}

TRANSCRIPT EXCERPT:
${(fullTranscript || '').slice(0, 18000)}

TARGET LANGUAGE: ${targetLanguage}

Return this exact JSON schema:
{
  "title": "string",
  "scope": "string",
  "questions": [
    {
      "question": "string",
      "choices": ["string", "string", "string", "string"],
      "answerIndex": number,
      "explanation": "string",
      "timestamp": number
    }
  ],
  "language": "${targetLanguage}"
}
`;

  try {
    const quiz = await getGeminiResponse(SYSTEM_PROMPT, userPrompt);
    return { ...quiz, error: null };
  } catch (error) {
    console.error('Quiz Agent Error:', error);
    const errorCode = error.message === 'GEMINI_OUTPUT_TRUNCATED'
      ? 'GEMINI_OUTPUT_TRUNCATED'
      : 'QUIZ_GENERATION_FAILED';
    return { error: errorCode, message: error.message };
  }
};
