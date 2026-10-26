import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

interface CloudinaryUploadResult {
  secureUrl: string;
  publicId: string;
  resourceType: string;
  bytes: number;
  format?: string;
}

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

  async uploadFile(
    file: Express.Multer.File,
    folder = 'lms/content',
  ): Promise<CloudinaryUploadResult> {
    console.log({
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  hasApiSecret: !!process.env.CLOUDINARY_API_SECRET,
  apiSecretLength: process.env.CLOUDINARY_API_SECRET?.length,
});
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error || !result) {
            // Log the ORIGINAL Cloudinary error
            this.logger.error(
              'Cloudinary upload failed',
              error instanceof Error
                ? error.stack
                : JSON.stringify(error),
            );

            // Keep the original error as the cause
            reject(
              new InternalServerErrorException(
                'Failed to upload file to Cloudinary',
                {
                  cause: error,
                },
              ),
            );

            return;
          }

          resolve({
            secureUrl: result.secure_url,
            publicId: result.public_id,
            resourceType: result.resource_type,
            bytes: result.bytes,
            format: result.format,
          });
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  async deleteFile(
    publicId: string,
    resourceType: string,
  ): Promise<void> {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType as 'image' | 'video' | 'raw',
        invalidate: true,
      });

      if (result.result !== 'ok' && result.result !== 'not found') {
        this.logger.error(
          `Cloudinary delete failed: ${JSON.stringify(result)}`,
        );

        throw new InternalServerErrorException(
          'Failed to delete file from Cloudinary',
        );
      }
    } catch (error) {
      this.logger.error(
        'Cloudinary delete error',
        error instanceof Error
          ? error.stack
          : JSON.stringify(error),
      );

      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to delete file from Cloudinary',
        {
          cause: error,
        },
      );
    }
  }
}