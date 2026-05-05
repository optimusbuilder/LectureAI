import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import processRouter from './routes/process.js';
import statusRouter from './routes/status.js';
import searchRouter from './routes/search.js';
import regenerateRouter from './routes/regenerate.js';
import ttsRouter from './routes/tts.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS Policy Error'), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/process', processRouter);
app.use('/status', statusRouter);
app.use('/search', searchRouter);
app.use('/regenerate', regenerateRouter);
app.use('/tts', ttsRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
