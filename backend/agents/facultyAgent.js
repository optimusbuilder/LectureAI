import { getGeminiResponse } from '../lib/gemini.js';

const SYSTEM_PROMPT = `
You are a Senior Faculty Developer and Pedagogical Coach. Your duty is to provide a constructive, evidence-based pedagogical audit of a lecture.

TONE:
- Encouraging, professional, and peer-to-peer. 
- Never use "Bad" or "Wrong." 
- Use "Opportunity for clarity," "Consider diversifying," or "Would benefit from."
- Be specific enough that an instructor could make edits immediately.
- Prefer evidence and timestamps over generic teaching advice.

METRIC PILLARS (Score each 0-100):
1. Clarity: Is the logic linear? Are terms defined?
2. Accessibility: Are visual aids described? Is the audio clear (based on transcript flow)?
3. Equity & Inclusivity: Are examples culturally diverse? Do they rely on Western-centric assumptions?
4. Pacing: Is there a "mid-lecture slump" or "cognitive overload"?

RETURN FORMAT:
Strictly raw JSON matching the provided schema. No markdown. No preamble.
`;

/**
 * Faculty Audit Agent
 * Responsibility: Provide constructive feedback for instructors.
 */
export const facultyAgent = async (intelligenceData, ingestionData) => {
  const { title, fullTranscript } = ingestionData;

  const userPrompt = `
Audit this lecture for the instructor:

VIDEO TITLE: ${title}
LECTURE ANALYSIS: ${JSON.stringify(intelligenceData, null, 2)}
FULL TRANSCRIPT:
${fullTranscript}

Return a JSON object with this exact schema:
{
  "overallScore": number (0-100),
  "executiveSummary": "string — 2-3 sentence private coaching summary for the instructor",
  "strongestMoment": {
    "title": "string — strongest teaching move",
    "description": "string — why this worked and what to keep doing",
    "timestamp": number
  },
  "topPriority": { 
    "title": "string — short title of the issue", 
    "description": "string — detailed explanation with suggested fix",
    "timestamp": number,
    "impact": "string (High|Medium|Low)",
    "effort": "string (Quick fix|Moderate|Redesign)"
  },
  "dimensions": [
    { 
      "name": "string (Clarity|Accessibility|Equity|Pacing)", 
      "score": number (0-100), 
      "feedback": "string — 2-3 sentence summary of findings for this dimension",
      "keepDoing": ["string — positive practice to preserve"],
      "improveBeforePublishing": ["string — concrete improvement"],
      "suggestions": ["string — backwards-compatible summary suggestions"],
      "evidence": [
        {
          "timestamp": number,
          "quoteOrMoment": "string — concise reference to what happened",
          "whyItMatters": "string — pedagogical significance"
        }
      ]
    }
  ],
  "timestampedSuggestions": [
    { 
      "timestamp": number (seconds into the lecture), 
      "note": "string — what the issue is and how to fix it",
      "type": "string (positive|improvement)",
      "impact": "string (High|Medium|Low)",
      "effort": "string (Quick fix|Moderate|Redesign)",
      "suggestedRewrite": "string — if improvement, write the exact sentence(s) the instructor could say instead; if positive, describe how to reuse this move"
    }
  ],
  "publishingChecklist": [
    {
      "item": "string — concrete action before publishing",
      "timestamp": number,
      "impact": "string (High|Medium|Low)"
    }
  ]
}

RULES:
1. "topPriority" must be the single most impactful change the instructor can make.
2. Provide 4-6 specific "timestampedSuggestions" for specific moments in the transcript.
3. Frame all suggestions as a coach helping a colleague. Use "positive" type for things done well, "improvement" for suggested changes.
4. Every dimension MUST have "Clarity", "Accessibility", "Equity", or "Pacing" as its name.
5. For Accessibility, explicitly check whether visual references, formulas, acronyms, transitions, and examples are understandable to an audio-only learner.
6. Evidence entries must cite real timestamps from the transcript markers.
7. Include 4-6 publishingChecklist items, ordered by practical priority.
`;

  try {
    const report = await getGeminiResponse(SYSTEM_PROMPT, userPrompt);
    return { ...report, error: null };
  } catch (error) {
    console.error('Faculty Agent Error:', error);
    const errorCode = error.message === 'GEMINI_OUTPUT_TRUNCATED'
      ? 'GEMINI_OUTPUT_TRUNCATED'
      : 'FACULTY_AUDIT_FAILED';
    return { error: errorCode, message: error.message };
  }
};
