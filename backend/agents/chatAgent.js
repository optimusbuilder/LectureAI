import { getGeminiResponse } from '../lib/gemini.js';

const SYSTEM_PROMPT = `You are a friendly, knowledgeable study assistant embedded inside a lecture learning tool. A student is exploring a visual knowledge map of their lecture and has clicked on a topic node.

Your job:
- Answer questions about the specific topic they've selected, using the lecture transcript as your primary source
- Be concise (2-4 sentences typically) but thorough when asked to elaborate
- If the student asks something not covered in the lecture, say so honestly and suggest what the lecture DID cover on related topics
- Reference specific moments ("Around the 5-minute mark, the professor explains...")  when relevant
- Be warm and encouraging — you're helping them study, not testing them
- Use plain language. Avoid academic jargon unless the student used it first.`;

/**
 * Chat Agent
 * Responsibility: Answer student questions about a specific topic within a lecture.
 */
export const chatAgent = async (message, topicContext, fullTranscript, chatHistory = []) => {
  const historyText = chatHistory.length > 0
    ? chatHistory.map(m => `${m.role === 'user' ? 'Student' : 'Assistant'}: ${m.content}`).join('\n')
    : '';

  const userPrompt = `
LECTURE TRANSCRIPT (for reference):
${fullTranscript.slice(0, 15000)}

CURRENT TOPIC THE STUDENT IS EXPLORING:
Title: ${topicContext.title}
Time in video: ${topicContext.startTime}s - ${topicContext.endTime}s
Summary: ${topicContext.summary}
Key terms: ${(topicContext.keyTerms || []).join(', ')}

${historyText ? `CONVERSATION SO FAR:\n${historyText}\n` : ''}
STUDENT'S MESSAGE:
${message}

Respond helpfully and concisely.`;

  try {
    const response = await getGeminiResponse(SYSTEM_PROMPT, userPrompt, false);
    return { reply: response, error: null };
  } catch (error) {
    console.error('Chat Agent Error:', error);
    return { error: 'CHAT_FAILED', message: error.message };
  }
};
