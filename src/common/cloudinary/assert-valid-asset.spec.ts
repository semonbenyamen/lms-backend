import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { CloudinaryResourceType } from '../enums/cloudinary-resource-type.enum.js';
import { assertValidAsset } from './assert-valid-asset.js';

describe('assertValidAsset', () => {
  const image = {
    secureUrl: 'https://res.cloudinary.com/demo/image/upload/i.png',
    publicId: 'lms/courses/c-1/thumbnail/i',
    resourceType: 'image',
    format: 'png',
    bytes: 2048,
  };

  const check = (asset: typeof image | null) => () =>
    assertValidAsset(asset, CloudinaryResourceType.IMAGE);

  it('should accept an allowed file', () => {
    expect(check(image)).not.toThrow();
    expect(check({ ...image, format: 'JPG' })).not.toThrow();
  });

  it('should reject a missing file', () => {
    expect(check(null)).toThrow('The uploaded file was not found');
  });

  it('should reject another resource type', () => {
    expect(check({ ...image, resourceType: 'video' })).toThrow(
      'The uploaded file must be an image',
    );
  });

  it('should reject a format that is not allowed', () => {
    expect(check({ ...image, format: 'gif' })).toThrow(
      'The uploaded file must be one of: jpg, jpeg, png, webp',
    );
  });

  it('should reject a file above the size limit', () => {
    expect(check({ ...image, bytes: 11 * 1024 * 1024 })).toThrow(
      BadRequestException,
    );
  });
});
