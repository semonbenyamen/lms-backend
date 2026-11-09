
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'node:crypto';
import { ContentUploadResourceType } from '../enums/content-upload-resource-type.enum.js';
const CLOUDINARY_UPLOAD_TIMEOUT_MS = 120_000;

type CloudinaryResourceType = 'image' | 'video' | 'raw';

interface CloudinaryUploadResult {
  secureUrl: string;
  publicId: string;
  resourceType: string;
  bytes: number;
  format?: string;
}

export interface CloudinaryAssetDetails {
  secureUrl: string;
  publicId: string;
  resourceType: string;
  bytes: number;
  format: string;
  originalFilename?: string;
}

function isCloudinaryResourceType(
  value: string,
): value is CloudinaryResourceType {
  return ['image', 'video', 'raw'].includes(value);
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.getOrThrow<string>(
        'CLOUDINARY_CLOUD_NAME',
      ),
      api_key: this.configService.getOrThrow<string>(
        'CLOUDINARY_API_KEY',
      ),
      api_secret: this.configService.getOrThrow<string>(
        'CLOUDINARY_API_SECRET',
      ),
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    folder = 'lms/content',
  ): Promise<CloudinaryUploadResult> {
    return new Promise((resolve, reject) => {
      let settled = false;

      const fail = (error: unknown) => {
        if (settled) return;

        settled = true;

        this.logger.error(
          'Cloudinary upload failed',
          error instanceof Error
            ? error.stack
            : String(error),
        );

        reject(
          new InternalServerErrorException(
            'Failed to upload file to Cloudinary',
            { cause: error },
          ),
        );
      };

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          timeout: CLOUDINARY_UPLOAD_TIMEOUT_MS,
        },
        (error, result) => {
          if (error || !result) {
            fail(error ?? new Error('Empty Cloudinary upload response'));
            return;
          }

          if (settled) return;
          settled = true;

          resolve({
            secureUrl: result.secure_url,
            publicId: result.public_id,
            resourceType: result.resource_type,
            bytes: result.bytes,
            format: result.format,
          });
        },
      );

      uploadStream.on('error', (error: Error) => {
        fail(error);
      });

      uploadStream.end(file.buffer);
    });
  }

  async deleteFile(
    publicId: string,
    resourceType: string,
  ): Promise<void> {
    if (!isCloudinaryResourceType(resourceType)) {
      throw new BadRequestException(
        'Invalid Cloudinary resource type',
      );
    }

    if (!publicId.trim()) {
      throw new BadRequestException('Public ID is required');
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        invalidate: true,
      });

      if (result.result === 'ok' || result.result === 'not found') {
        return;
      }

      this.logger.error(
        `Cloudinary delete returned unexpected result: ${JSON.stringify(result)}`,
      );

      throw new Error('Unexpected Cloudinary delete response');
    } catch (error) {
      this.logger.error(
        'Cloudinary delete failed',
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException(
        'Failed to delete file from Cloudinary',
        { cause: error },
      );
    }
  }

  async getAssetDetails(
    publicId: string,
    resourceType: ContentUploadResourceType,
  ): Promise<CloudinaryAssetDetails> {
    try {
      const result = await cloudinary.api.resource(publicId, {
        resource_type: resourceType,
        type: 'upload',
      });

      return {
        secureUrl: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type,
        bytes: result.bytes,
        format: result.format,
        originalFilename: result.original_filename,
      };
    } catch (error) {
      const httpCode = (
        error as { http_code?: number }
      )?.http_code;

      if (httpCode === 404) {
        throw new BadRequestException(
          'Uploaded file was not found in Cloudinary',
        );
      }

      this.logger.error(
        'Failed to retrieve Cloudinary asset',
        error instanceof Error
          ? error.stack
          : String(error),
      );

      throw new InternalServerErrorException(
        'Failed to verify uploaded file',
        { cause: error },
      );
    }
  }

  createUploadSignature(
    resourceType: ContentUploadResourceType,
  ) {
    const timestamp = Math.floor(Date.now() / 1000);

    // Generated by the backend, never supplied by the client.
    const publicId = `lms_content_pending_${randomUUID()}`;

    const apiSecret = this.configService.getOrThrow<string>(
      'CLOUDINARY_API_SECRET',
    );

    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        public_id: publicId,
      },
      apiSecret,
    );

    return {
      cloudName: this.configService.getOrThrow<string>(
        'CLOUDINARY_CLOUD_NAME',
      ),
      apiKey: this.configService.getOrThrow<string>(
        'CLOUDINARY_API_KEY',
      ),
      timestamp,
      publicId,
      resourceType,
      signature,
    };
  }
}
