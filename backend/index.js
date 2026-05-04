import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import processRouter from './routes/process.js';
import statusRouter from './routes/status.js';
import searchRouter from './routes/search.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
