import { BadRequestException } from '@nestjs/common';

import { CloudinaryResourceType } from '../enums/cloudinary-resource-type.enum.js';
import { CloudinaryAssetDetails } from './cloudinary.service.js';
import { UPLOAD_RULES } from './upload-rules.js';

// Checks a file the frontend uploaded before we save it. It throws HTTP
// errors, so modules call it, not CloudinaryService.
export function assertValidAsset(
  asset: CloudinaryAssetDetails | null,
  resourceType: CloudinaryResourceType,
): asserts asset is CloudinaryAssetDetails {
  if (!asset) {
    throw new BadRequestException('The uploaded file was not found');
  }

  const rule = UPLOAD_RULES[resourceType];

  if (asset.resourceType !== resourceType) {
    throw new BadRequestException(
      `The uploaded file must be an ${resourceType}`,
    );
  }

  if (!rule.formats.includes(asset.format.toLowerCase())) {
    throw new BadRequestException(
      `The uploaded file must be one of: ${rule.formats.join(', ')}`,
    );
  }

  if (asset.bytes > rule.maxBytes) {
    throw new BadRequestException(
      `The uploaded file must be at most ${rule.maxBytes / (1024 * 1024)} MB`,
    );
  }
}
