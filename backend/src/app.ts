import express from 'express';
import mongoose from 'mongoose';
import authRoutes from './routes/auth';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:5173',
  'https://smart-day-compass.vercel.app' // Vercel frontend URL
];

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use(helmet()); // Add security headers

// Routes
app.use('/api/auth', authRoutes);

// Healthcheck route
app.get('/', (req, res) => res.send('OK'));

// Connect DB and start server
mongoose
  .connect(process.env.MONGODB_URI || '')
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });
