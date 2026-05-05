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
  'https://vulpo.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS Policy Error'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Handle preflight for ALL routes first, before any other middleware
app.options('*', cors(corsOptions));

// Then apply CORS to all other requests
app.use(cors(corsOptions));

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
