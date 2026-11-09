import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { v2 as cloudinary } from 'cloudinary';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CloudinaryResourceType } from '../enums/cloudinary-resource-type.enum.js';
import { CloudinaryService } from './cloudinary.service.js';

vi.mock('cloudinary', () => ({
  v2: {
    config: vi.fn(),
    utils: { api_sign_request: vi.fn() },
    api: { resource: vi.fn() },
    uploader: { destroy: vi.fn() },
  },
}));

describe('CloudinaryService', () => {
  let service: CloudinaryService;

  const config: Record<string, string> = {
    CLOUDINARY_CLOUD_NAME: 'demo-cloud',
    CLOUDINARY_API_KEY: 'demo-key',
    CLOUDINARY_API_SECRET: 'demo-secret',
  };

  const configServiceMock = {
    getOrThrow: vi.fn((key: string) => config[key]),
  };

  const publicId = 'lms/lessons/l-1/file-1';

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudinaryService,
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get<CloudinaryService>(CloudinaryService);
  });

  it('should configure Cloudinary from the config service', () => {
    expect(cloudinary.config).toHaveBeenCalledWith({
      cloud_name: 'demo-cloud',
      api_key: 'demo-key',
      api_secret: 'demo-secret',
    });
  });

  describe('createUploadSignature', () => {
    it('should sign the public id, timestamp and allowed formats', () => {
      vi.mocked(cloudinary.utils.api_sign_request).mockReturnValue('signed');

      const result = service.createUploadSignature(
        publicId,
        CloudinaryResourceType.IMAGE,
      );

      const signedParams = {
        timestamp: result.timestamp,
        public_id: publicId,
        allowed_formats: 'jpg,jpeg,png,webp',
      };
      expect(cloudinary.utils.api_sign_request).toHaveBeenCalledWith(
        signedParams,
        'demo-secret',
      );
      expect(result).toEqual({
        cloudName: 'demo-cloud',
        apiKey: 'demo-key',
        timestamp: expect.any(Number),
        publicId,
        resourceType: CloudinaryResourceType.IMAGE,
        allowedFormats: 'jpg,jpeg,png,webp',
        signature: 'signed',
      });
    });

    it('should allow only video formats for a video', () => {
      const result = service.createUploadSignature(
        publicId,
        CloudinaryResourceType.VIDEO,
      );

      expect(result.allowedFormats).toBe('mp4,webm');
    });
  });

  describe('getAssetDetails', () => {
    it('should return the file details', async () => {
      vi.mocked(cloudinary.api.resource).mockResolvedValue({
        secure_url: 'https://res.cloudinary.com/demo/image/upload/file-1.png',
        public_id: publicId,
        resource_type: 'image',
        format: 'png',
        bytes: 2048,
      });

      const result = await service.getAssetDetails(
        publicId,
        CloudinaryResourceType.IMAGE,
      );

      expect(result).toEqual({
        secureUrl: 'https://res.cloudinary.com/demo/image/upload/file-1.png',
        publicId,
        resourceType: 'image',
        format: 'png',
        bytes: 2048,
      });
      expect(cloudinary.api.resource).toHaveBeenCalledWith(
        publicId,
        expect.objectContaining({ resource_type: 'image', type: 'upload' }),
      );
    });

    it('should return null when the file does not exist', async () => {
      vi.mocked(cloudinary.api.resource).mockRejectedValue({
        error: { http_code: 404, message: 'Resource not found' },
      });

      await expect(
        service.getAssetDetails(publicId, CloudinaryResourceType.IMAGE),
      ).resolves.toBeNull();
    });

    it('should throw a plain error with the cause for other failures', async () => {
      const failure = { error: { http_code: 500, message: 'Server error' } };
      vi.mocked(cloudinary.api.resource).mockRejectedValue(failure);

      await expect(
        service.getAssetDetails(publicId, CloudinaryResourceType.IMAGE),
      ).rejects.toMatchObject({ cause: failure });
    });
  });

  describe('deleteFile', () => {
    it('should delete the file with a timeout', async () => {
      vi.mocked(cloudinary.uploader.destroy).mockResolvedValue({
        result: 'ok',
      });

      await service.deleteFile(publicId, CloudinaryResourceType.VIDEO);

      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(publicId, {
        resource_type: 'video',
        invalidate: true,
        timeout: expect.any(Number),
      });
    });

    it('should treat a missing file as deleted', async () => {
      vi.mocked(cloudinary.uploader.destroy).mockResolvedValue({
        result: 'not found',
      });

      await expect(
        service.deleteFile(publicId, CloudinaryResourceType.IMAGE),
      ).resolves.toBeUndefined();
    });

    it('should throw with the result as the cause for another result', async () => {
      const failure = { result: 'error' };
      vi.mocked(cloudinary.uploader.destroy).mockResolvedValue(failure);

      await expect(
        service.deleteFile(publicId, CloudinaryResourceType.IMAGE),
      ).rejects.toMatchObject({
        message: 'Failed to delete the file from Cloudinary',
        cause: failure,
      });
    });

    it('should throw a plain error with the cause when the call fails', async () => {
      const failure = new Error('Request Timeout');
      vi.mocked(cloudinary.uploader.destroy).mockRejectedValue(failure);

      await expect(
        service.deleteFile(publicId, CloudinaryResourceType.IMAGE),
      ).rejects.toMatchObject({ cause: failure });
    });
  });
});
