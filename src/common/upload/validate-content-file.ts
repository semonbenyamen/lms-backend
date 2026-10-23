
import { BadRequestException } from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';

const ALLOWED_MIME_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export async function validateContentFile(
  file: Express.Multer.File,
): Promise<void> {
  if (!file?.buffer?.length) {
    throw new BadRequestException('Uploaded file is empty or missing.');
  }

  const detectedType = await fileTypeFromBuffer(file.buffer);

  if (
    !detectedType ||
    !ALLOWED_MIME_TYPES.has(detectedType.mime) ||
    detectedType.mime !== file.mimetype
  ) {
    throw new BadRequestException(
      'Invalid file content or unsupported file type.',
    );
  }
}

