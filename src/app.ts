import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import installRoutes from './routes/installRoutes';
import { requireSystemInit } from './middleware/systemInitCheck';

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

// Installation routes - no auth required
app.use('/install', installRoutes);

// Protected routes - require system to be initialized
app.use('/api', requireSystemInit, (req, res, next) => {
  // Here you would add your auth middleware and other API routes
  next();
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;