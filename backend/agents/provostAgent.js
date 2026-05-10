import { getGeminiResponse } from '../lib/gemini.js';

const SYSTEM_PROMPT = `
You are a provost-level curriculum analyst. Your job is to compare what was actually taught in recorded lectures against stated course learning objectives.

Be evidence-driven and institutionally useful. Do not overclaim. If coverage is weak or missing, say so clearly and constructively.

RETURN FORMAT:
Strictly raw JSON matching the provided schema. No markdown. No preamble.
`;

export const provostAgent = async ({ courseTitle, learningObjectives, lectures }) => {
  const compactLectures = lectures.map((lecture, lectureIndex) => ({
    lectureIndex,
    title: lecture.title,
    videoId: lecture.videoId,
    duration: lecture.duration,
    author: lecture.author,
    overallSummary: lecture.intelligenceData?.overallSummary,
    topics: (lecture.intelligenceData?.topics || []).map(topic => ({
      id: topic.id,
      title: topic.title,
      startTime: topic.startTime,
      endTime: topic.endTime,
      summary: topic.summary,
      keyTerms: topic.keyTerms
    })),
    pedagogicalSignals: lecture.intelligenceData?.pedagogicalSignals
  }));

  const userPrompt = `
Analyze curriculum coverage for this course.

COURSE TITLE:
${courseTitle}

STATED LEARNING OBJECTIVES:
${learningObjectives.map((objective, index) => `${index + 1}. ${objective}`).join('\n')}

LECTURES ACTUALLY TAUGHT:
${JSON.stringify(compactLectures, null, 2)}

Return this exact JSON schema:
{
  "courseTitle": "string",
  "courseSummary": "string — 3-5 sentences describing what the lecture set actually emphasizes",
  "overallCoverageScore": number (0-100),
  "objectiveCoverage": [
    {
      "objective": "string — original learning objective",
      "status": "string (Covered|Partial|Missing)",
      "coverageScore": number (0-100),
      "confidence": number (0-100),
      "summary": "string — how well this objective is supported by the lectures",
      "evidence": [
        {
          "lectureIndex": number,
          "lectureTitle": "string",
          "timestamp": number,
          "moment": "string — concise topic/source moment",
          "whyItMatters": "string — why this moment supports or partially supports the objective"
        }
      ],
      "gap": "string — what remains under-served or missing",
      "recommendedAction": "string — concrete course-level fix"
    }
  ],
  "lectureMatrix": [
    {
      "lectureIndex": number,
      "lectureTitle": "string",
      "objectiveScores": [
        {
          "objectiveIndex": number,
          "score": number (0-100),
          "rationale": "string"
        }
      ]
    }
  ],
  "underServedObjectives": [
    {
      "objective": "string",
      "reason": "string",
      "recommendedLectureOrActivity": "string"
    }
  ],
  "recommendations": ["string — high-level curriculum recommendation"]
}

RULES:
1. Keep objectiveCoverage in the same order as the stated objectives.
2. Use "Covered" only when multiple lecture moments clearly support the objective or one lecture covers it deeply.
3. Use "Partial" when the lectures touch the objective but do not fully satisfy it.
4. Use "Missing" when there is no meaningful evidence.
5. Evidence must point to real lectureIndex values and timestamps from the supplied topics.
6. The lectureMatrix must include every lecture and every objective.
`;

  try {
    const report = await getGeminiResponse(SYSTEM_PROMPT, userPrompt);
    return { ...report, error: null };
  } catch (error) {
    console.error('Provost Agent Error:', error);
    const errorCode = error.message === 'GEMINI_OUTPUT_TRUNCATED'
      ? 'GEMINI_OUTPUT_TRUNCATED'
      : 'PROVOST_ANALYSIS_FAILED';
    return { error: errorCode, message: error.message };
  }
};
