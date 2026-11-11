import { ApiProperty } from '@nestjs/swagger';

import { CloudinaryResourceType } from '../../enums/cloudinary-resource-type.enum.js';

// What the frontend sends to Cloudinary with the file, exactly as returned.
export class UploadSignatureResponseDto {
  @ApiProperty({ example: 'demo-cloud' })
  cloudName: string;

  @ApiProperty({ example: '123456789012345' })
  apiKey: string;

  @ApiProperty({ example: 1793750400, description: 'Unix time in seconds' })
  timestamp: number;

  @ApiProperty({
    example: 'lms/lessons/550e8400-e29b-41d4-a716-446655440003/9b2f...',
    description: 'Send it back as mediaPublicId after the upload',
  })
  publicId: string;

  @ApiProperty({
    example: CloudinaryResourceType.VIDEO,
    enum: CloudinaryResourceType,
  })
  resourceType: CloudinaryResourceType;

  @ApiProperty({ example: 'mp4,webm' })
  allowedFormats: string;

  @ApiProperty({ example: 'a1b2c3d4e5f6...' })
  signature: string;
}
