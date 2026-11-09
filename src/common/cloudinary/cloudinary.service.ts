import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

import { CloudinaryResourceType } from '../enums/cloudinary-resource-type.enum.js';
import { UPLOAD_RULES } from './upload-rules.js';

// A stuck Cloudinary call fails instead of keeping the request waiting.
const CLOUDINARY_TIMEOUT_MS = 30_000;

export interface CloudinaryAssetDetails {
  secureUrl: string;
  publicId: string;
  resourceType: string;
  format: string;
  bytes: number;
}

export interface CloudinaryUploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  publicId: string;
  resourceType: CloudinaryResourceType;
  allowedFormats: string;
  signature: string;
}

// Files are uploaded by the frontend with a signature, so this service only
// signs, checks and deletes them. It throws plain errors; the exception
// filter turns them into 500 responses.
@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly cloudName: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(configService: ConfigService) {
    this.cloudName = configService.getOrThrow<string>('CLOUDINARY_CLOUD_NAME');
    this.apiKey = configService.getOrThrow<string>('CLOUDINARY_API_KEY');
    this.apiSecret = configService.getOrThrow<string>('CLOUDINARY_API_SECRET');

    cloudinary.config({
      cloud_name: this.cloudName,
      api_key: this.apiKey,
      api_secret: this.apiSecret,
    });
  }

  // The caller builds the public id, so it can tell which lesson or course
  // the file belongs to when the file comes back.
  createUploadSignature(
    publicId: string,
    resourceType: CloudinaryResourceType,
  ): CloudinaryUploadSignature {
    const timestamp = Math.floor(Date.now() / 1000);
    const allowedFormats = UPLOAD_RULES[resourceType].formats.join(',');

    // Every signed param must be sent by the frontend exactly as returned.
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        public_id: publicId,
        allowed_formats: allowedFormats,
      },
      this.apiSecret,
    );

    return {
      cloudName: this.cloudName,
      apiKey: this.apiKey,
      timestamp,
      publicId,
      resourceType,
      allowedFormats,
      signature,
    };
  }

  // Returns null when the file does not exist, so the caller decides the 400.
  async getAssetDetails(
    publicId: string,
    resourceType: CloudinaryResourceType,
  ): Promise<CloudinaryAssetDetails | null> {
    try {
      const result = await cloudinary.api.resource(publicId, {
        resource_type: resourceType,
        type: 'upload',
        timeout: CLOUDINARY_TIMEOUT_MS,
      });

      return {
        secureUrl: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type,
        format: result.format,
        bytes: result.bytes,
      };
    } catch (error) {
      if (this.isNotFound(error)) {
        return null;
      }

      throw new Error('Failed to get the file details from Cloudinary', {
        cause: error,
      });
    }
  }

  async deleteFile(
    publicId: string,
    resourceType: CloudinaryResourceType,
  ): Promise<void> {
    // The SDK types miss timeout here, but the uploader reads it.
    const options = {
      resource_type: resourceType,
      invalidate: true,
      timeout: CLOUDINARY_TIMEOUT_MS,
    };
    let result: { result?: string };

    try {
      result = await cloudinary.uploader.destroy(publicId, options);
    } catch (error) {
      throw new Error('Failed to delete the file from Cloudinary', {
        cause: error,
      });
    }

    // A file that is already gone counts as deleted.
    if (result.result !== 'ok' && result.result !== 'not found') {
      this.logger.error(
        `Unexpected Cloudinary delete result: ${JSON.stringify(result)}`,
      );
      throw new Error('Failed to delete the file from Cloudinary');
    }
  }

  // --- Helper Methods ---

  private isNotFound(error: unknown): boolean {
    // The Admin API rejects with { error: { http_code } } for a missing file.
    const httpCode =
      (error as { http_code?: number } | null)?.http_code ??
      (error as { error?: { http_code?: number } } | null)?.error?.http_code;

    return httpCode === 404;
  }
}
