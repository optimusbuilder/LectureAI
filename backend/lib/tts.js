import dotenv from 'dotenv';
dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'cENJycK4Wg62xVikqkaA';

/**
 * Text-to-Speech Utility
 * Responsibility: Convert text to audio using ElevenLabs.
 */
export const generateTTS = async (text) => {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY is missing');
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.json();
    console.error('ElevenLabs Error:', errorBody);
    throw new Error('Failed to generate audio');
  }

  // Return the audio buffer
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};
