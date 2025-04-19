import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

// Create storage configuration
const storage = multer.memoryStorage();

// Debug middleware to check request before multer processes it
export const debugRequest = (req: Request, res: Response, next: NextFunction) => {
  console.log('→ [DEBUG REQUEST]', req.method, req.originalUrl);
  console.log('   Headers:', req.headers);
  console.log('   Content-Type:', req.get('content-type'));
  console.log('   Body keys:', Object.keys(req.body || {}));
  next();
};

// Configure multer with more detailed error handling
export const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Custom middleware to handle file upload with detailed logging
export const handleFileUpload = (fieldName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    logger.info(`Processing file upload for field: ${fieldName}`);
    logger.debug('Request headers:', req.headers);
    
    const uploadSingle = upload.single(fieldName);
    
    uploadSingle(req, res, (err) => {
      if (err) {
        logger.error('File upload error:', err);
        return res.status(400).json({ 
          message: 'File upload error', 
          details: err.message 
        });
      }
      
      if (!req.file) {
        logger.info('No file was uploaded');
      } else {
        logger.info(`File uploaded successfully: ${req.file.originalname}`);
        logger.debug('File details:', {
          fieldname: req.file.fieldname,
          originalname: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        });
      }
      
      next();
    });
  };
};