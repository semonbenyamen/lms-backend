
import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';
import { extname } from 'node:path';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const ALLOWED_FILES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export const contentUploadOptions: MulterOptions = {
  // The file is temporarily held in memory before Cloudinary upload.
  storage: memoryStorage(),

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
    fields: 20,
    parts: 21,
    fieldNameSize: 100,
    fieldSize: 1024 * 1024, // 1 MB per text field
  },

  fileFilter: (_request, file, callback) => {
    const extension = extname(file.originalname).toLowerCase();
    const expectedMimeType = ALLOWED_FILES[extension];

    // Reject unknown extensions and extension/MIME mismatches.
    if (!expectedMimeType || file.mimetype !== expectedMimeType) {
      return callback(
        new BadRequestException(
          'Unsupported file type. Allowed: MP4, WebM, JPG, PNG, WebP.',
        ),
        false,
      );
    }

    callback(null, true);
  },
};
