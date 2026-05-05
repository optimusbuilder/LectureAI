import express from 'express';
import { generateTTS } from '../lib/tts.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    const audioBuffer = await generateTTS(text);
    
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
    });

    res.send(audioBuffer);
  } catch (error) {
    console.error('TTS Route Error:', error);
    res.status(500).json({ error: 'TTS_FAILED', message: error.message });
  }
});

export default router;
