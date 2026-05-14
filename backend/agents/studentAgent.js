import { getGeminiResponse } from '../lib/gemini.js';

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
  const sectionSystemPrompt = [
    'You are an elite academic tutor creating one section of lecture study materials.',
    'Return ONLY valid raw JSON for the requested section.',
    'No markdown, no comments, no preamble, no extra keys.',
    'Use only escaped newlines inside JSON strings.'
  ].join(' ');

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
Summaries must be substantial:
- short: at least 100 words
- medium: at least 300 words
- full: at least 600 words
Use paragraph breaks as escaped \\n\\n inside the JSON string.
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
  try {
    const output = await generateStudentOutputInSections(intelligenceData, targetLanguage);
    return { ...output, error: null };
  } catch (error) {
    console.error('Student Agent Error:', error);
    const output = normalizeStudentOutput({}, intelligenceData, targetLanguage);
    return { ...output, deterministicFallback: true, error: null };
  }
};
