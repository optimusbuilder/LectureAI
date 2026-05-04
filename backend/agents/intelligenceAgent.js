import { getGeminiResponse } from '../lib/gemini.js';

const SYSTEM_PROMPT = `
You are a Master Pedagogical Analyst with PhD-level expertise in curriculum design. Your duty is to perform a rigorous structural and thematic autopsy of a lecture transcript. 

DUTIES:
- Structural Integrity: Identify major topic shifts. A "Topic" should be at least 2 minutes of content unless it's a critical definition.
- Pedagogical Audit: Look for "Cognitive Load" issues (pacing too fast), "Jargon Gaps" (terms used without definition), and "Implicit Bias" (lack of diverse examples).
- Mathematical Accuracy: Preserve LaTeX-style notation for any equations (e.g., $E=mc^2$).
- Chunking: Identify logical breakpoints for vector indexing (~300 tokens each).

RETURN FORMAT: 
Strictly raw JSON matching the provided schema. No markdown. No preamble.
`;

/**
 * Programmatically splits transcript into ~300 word chunks with overlap
 */
const chunkTranscript = (segments, wordsPerChunk = 300, overlap = 50) => {
  const words = [];
  segments.forEach(s => {
    const segmentWords = s.text.split(' ').map(w => ({ text: w, start: s.start }));
    words.push(...segmentWords);
  });

  const chunks = [];
  for (let i = 0; i < words.length; i += (wordsPerChunk - overlap)) {
    const chunkWords = words.slice(i, i + wordsPerChunk);
    if (chunkWords.length < 10) break; // Skip tiny tail chunks

    chunks.push({
      id: `chunk_${chunks.length + 1}`,
      text: chunkWords.map(w => w.text).join(' '),
      startTime: chunkWords[0].start,
      endTime: chunkWords[chunkWords.length - 1].start
    });

    if (i + wordsPerChunk >= words.length) break;
  }
  return chunks;
};

/**
 * Intelligence Agent
 * Responsibility: Deep structural and pedagogical analysis of the transcript.
 */
export const intelligenceAgent = async (ingestionData) => {
  const { title, duration, fullTranscript, transcriptSegments } = ingestionData;

  const userPrompt = `
Analyze the following lecture transcript:

VIDEO TITLE: ${title}
DURATION: ${duration} seconds

TRANSCRIPT:
${fullTranscript}

Return a JSON object with the following schema:
{
  "topics": [
    { 
      "title": "string", 
      "startTime": number, 
      "endTime": number, 
      "summary": "string", 
      "keyTerms": ["string"] 
    }
  ],
  "overallSummary": "string",
  "pedagogicalSignals": {
    "clarityScore": number,
    "pacingScore": number,
    "exampleDensity": "string",
    "accessibilityIssues": ["string"],
    "equityFlags": ["string"]
  }
}

RULES:
1. Every topic MUST have a start and end time that matches the transcript markers.
2. Be critical in the pedagogicalSignals. If the professor is rambling or confusing, reflect that in the scores.
`;

  try {
    const analysis = await getGeminiResponse(SYSTEM_PROMPT, userPrompt);
    
    // Perform programmatic chunking
    const chunks = chunkTranscript(transcriptSegments);

    return { ...analysis, chunks, error: null };
  } catch (error) {
    console.error('Intelligence Agent Error:', error);
    return { error: 'ANALYSIS_FAILED', message: error.message };
  }
};
