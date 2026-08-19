import multer from 'multer';
import { AppError } from '../utils/app-error';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
    callback(null, true);
  } else {
    callback(
      new AppError(
        `Invalid file type: ${file.mimetype}. Only JPEG, PNG, WEBP images and PDF documents are supported.`,
        400,
        'INVALID_FILE_TYPE'
      )
    );
  }
};

/**
 * Upload Middleware configured for 5MB max file size in memory
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 Megabytes
    files: 1,
  },
  fileFilter,
});
