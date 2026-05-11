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

const clampTimestamp = (value) => {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) return 0;
  return Math.max(0, Math.floor(timestamp));
};

const topicTimestamp = (topic) => clampTimestamp(topic?.startTime ?? topic?.timestamp);

const topicDigest = (topics = []) => topics.map((topic, index) => (
  `${index + 1}. ${topic.title || `Topic ${index + 1}`} (${topicTimestamp(topic)}s): ${topic.summary || ''}`
)).join('\n');

const buildFallbackOutline = (topics = []) => topics.map((topic, index) => ({
  title: topic.title || `Topic ${index + 1}`,
  timestamp: topicTimestamp(topic),
  children: (topic.keyTerms || []).slice(0, 4).map(term => ({
    title: String(term),
    timestamp: topicTimestamp(topic)
  }))
}));

const buildFallbackSummaries = (intelligenceData) => {
  const topics = intelligenceData.topics || [];
  const digest = topicDigest(topics) || intelligenceData.overallSummary || 'This lecture was processed, but no detailed topic breakdown was available.';
  const topicTitles = topics.map(topic => topic.title).filter(Boolean).join(', ');

  return {
    short: intelligenceData.overallSummary || `This lecture covers ${topicTitles || 'the main course topics'}. ${digest}`,
    medium: `${intelligenceData.overallSummary || 'The lecture develops its core ideas through several connected topics.'}\n\nMajor topics:\n${digest}`,
    full: `${intelligenceData.overallSummary || 'The lecture presents a sequence of connected concepts.'}\n\nDetailed topic-by-topic notes:\n${digest}\n\nUse the outline timestamps to revisit each part of the lecture for examples, transitions, and supporting details.`
  };
};

const buildFallbackFlashcards = (topics = []) => {
  const sourceTopics = topics.length > 0 ? topics : [{ title: 'the lecture', summary: 'the lecture material', startTime: 0, keyTerms: [] }];
  const cards = [];

  for (const topic of sourceTopics) {
    cards.push({
      front: `Explain the main idea behind ${topic.title || 'this topic'}.`,
      back: topic.summary || `Review the lecture segment around ${topicTimestamp(topic)} seconds for the main explanation.`,
      timestamp: topicTimestamp(topic)
    });

    for (const term of (topic.keyTerms || []).slice(0, 2)) {
      if (cards.length >= 15) break;
      cards.push({
        front: `How does ${term} connect to ${topic.title || 'this part of the lecture'}?`,
        back: topic.summary || `${term} is discussed as part of ${topic.title || 'this lecture topic'}.`,
        timestamp: topicTimestamp(topic)
      });
    }

    if (cards.length >= 15) break;
  }

  return cards.slice(0, Math.max(10, Math.min(15, cards.length)));
};

const normalizeStudentOutput = (output, intelligenceData, targetLanguage) => {
  const topics = intelligenceData.topics || [];
  const fallbackSummaries = buildFallbackSummaries(intelligenceData);
  const fallbackOutline = buildFallbackOutline(topics);
  const fallbackFlashcards = buildFallbackFlashcards(topics);

  const outline = Array.isArray(output?.outline) && output.outline.length > 0
    ? output.outline.map((item, index) => ({
      title: item?.title || fallbackOutline[index]?.title || `Topic ${index + 1}`,
      timestamp: clampTimestamp(item?.timestamp ?? fallbackOutline[index]?.timestamp),
      children: Array.isArray(item?.children)
        ? item.children.map(child => ({
          title: child?.title || 'Subtopic',
          timestamp: clampTimestamp(child?.timestamp ?? item?.timestamp)
        }))
        : []
    }))
    : fallbackOutline;

  const summaries = {
    short: output?.summaries?.short || fallbackSummaries.short,
    medium: output?.summaries?.medium || fallbackSummaries.medium,
    full: output?.summaries?.full || fallbackSummaries.full
  };

  const flashcards = Array.isArray(output?.flashcards) && output.flashcards.length > 0
    ? output.flashcards.map((card, index) => ({
      front: card?.front || fallbackFlashcards[index]?.front || 'What is the key idea from this part of the lecture?',
      back: card?.back || fallbackFlashcards[index]?.back || 'Review the linked lecture moment for the supporting explanation.',
      timestamp: clampTimestamp(card?.timestamp ?? fallbackFlashcards[index]?.timestamp)
    }))
    : fallbackFlashcards;

  return {
    outline,
    summaries,
    flashcards,
    language: output?.language || targetLanguage
  };
};

const sectionPrompt = ({ section, intelligenceData, targetLanguage }) => `
Generate only the "${section}" section for these lecture study materials.

LECTURE ANALYSIS:
${JSON.stringify({
  overallSummary: intelligenceData.overallSummary,
  topics: intelligenceData.topics,
  topicConnections: intelligenceData.topicConnections,
  pedagogicalSignals: intelligenceData.pedagogicalSignals
}, null, 2)}

TARGET LANGUAGE: ${targetLanguage}
`;

const generateStudentOutputInSections = async (intelligenceData, targetLanguage) => {
  const sectionSystemPrompt = 'Return ONLY valid raw JSON for the requested section. No markdown, no comments, no extra keys.';
  const [outlineResult, summariesResult, flashcardsResult] = await Promise.allSettled([
    getGeminiResponse(
      sectionSystemPrompt,
      `${sectionPrompt({ section: 'outline', intelligenceData, targetLanguage })}
Return schema:
{ "outline": [{ "title": "string", "timestamp": number, "children": [{ "title": "string", "timestamp": number }] }] }`
    ),
    getGeminiResponse(
      sectionSystemPrompt,
      `${sectionPrompt({ section: 'summaries', intelligenceData, targetLanguage })}
Return schema:
{ "summaries": { "short": "string", "medium": "string", "full": "string" } }`
    ),
    getGeminiResponse(
      sectionSystemPrompt,
      `${sectionPrompt({ section: 'flashcards', intelligenceData, targetLanguage })}
Generate 10-15 flashcards.
Return schema:
{ "flashcards": [{ "front": "string", "back": "string", "timestamp": number }] }`
    )
  ]);

  const sectionOutput = {
    ...(outlineResult.status === 'fulfilled' ? outlineResult.value : {}),
    ...(summariesResult.status === 'fulfilled' ? summariesResult.value : {}),
    ...(flashcardsResult.status === 'fulfilled' ? flashcardsResult.value : {}),
    language: targetLanguage
  };

  for (const [name, result] of Object.entries({ outline: outlineResult, summaries: summariesResult, flashcards: flashcardsResult })) {
    if (result.status === 'rejected') {
      console.warn(`Student Agent ${name} section fallback used:`, result.reason?.message || result.reason);
    }
  }

  return normalizeStudentOutput(sectionOutput, intelligenceData, targetLanguage);
};

/**
 * Student Output Agent
 * Responsibility: Generate study materials based on lecture intelligence.
 */
export const studentAgent = async (intelligenceData, targetLanguage = 'en') => {
  const { chunks, error, ...studyMaterialSource } = intelligenceData;

  const userPrompt = `
Using this lecture analysis, generate complete student study materials.

ANALYSIS:
${JSON.stringify(studyMaterialSource, null, 2)}

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
    return { ...normalizeStudentOutput(output, intelligenceData, targetLanguage), error: null };
  } catch (error) {
    console.error('Student Agent Error:', error);
    try {
      const output = await generateStudentOutputInSections(intelligenceData, targetLanguage);
      return { ...output, partialFallback: true, error: null };
    } catch (fallbackError) {
      console.error('Student Agent section fallback failed:', fallbackError);
      const output = normalizeStudentOutput({}, intelligenceData, targetLanguage);
      return { ...output, deterministicFallback: true, error: null };
    }
  }
};
