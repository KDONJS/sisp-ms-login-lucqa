import { createLogger, format, transports } from 'winston';
import path from 'path';

// Define los niveles de log
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colores para cada nivel
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Determina el nivel de log basado en el entorno
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : 'info';
};

// Formato personalizado para los logs
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  format.colorize({ all: true }),
  format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Crear el logger
const logger = createLogger({
  level: level(),
  levels,
  format: logFormat,
  transports: [
    new transports.Console(),
    new transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
    }),
    new transports.File({ 
      filename: path.join(process.cwd(), 'logs', 'combined.log') 
    }),
  ],
});

export default logger;