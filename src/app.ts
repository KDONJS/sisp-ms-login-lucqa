import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import installRoutes from './routes/installRoutes';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import { requireSystemInit } from './middleware/systemInitCheck';
import logger from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuración para servir archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));
// Configuración para vistas
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs'); // Puedes usar EJS como motor de plantillas

// Root route - landing page
app.get('/', (req, res) => {
  res.render('index');
});

// Installation routes - no auth required
app.use('/install', installRoutes);

// Protected routes - require system to be initialized
app.use('/api', requireSystemInit, (req, res, next) => {
  // Add auth and user routes
  next();
});

// Auth routes
app.use('/api/auth', authRoutes);

// User routes
app.use('/api/users', userRoutes);

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

export default app;