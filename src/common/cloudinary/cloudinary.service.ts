import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

// Files are uploaded straight from the frontend, so the backend only manages them.
@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('Cloudinary environment variables are missing');
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
  }

  async deleteFile(publicId: string, resourceType: string): Promise<void> {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType as 'image' | 'video' | 'raw',
        invalidate: true,
      });

      // A file that is already gone counts as deleted.
      if (result.result !== 'ok' && result.result !== 'not found') {
        this.logger.error(
          `Cloudinary delete failed: ${JSON.stringify(result)}`,
        );

        throw new InternalServerErrorException(
          'Failed to delete file from Cloudinary',
        );
      }
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      this.logger.error(
        'Cloudinary delete error',
        error instanceof Error ? error.stack : JSON.stringify(error),
      );

      throw new InternalServerErrorException(
        'Failed to delete file from Cloudinary',
        { cause: error },
      );
    }
  }
}
