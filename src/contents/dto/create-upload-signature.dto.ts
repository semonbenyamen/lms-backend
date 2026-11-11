import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

import { CloudinaryResourceType } from '../../common/enums/cloudinary-resource-type.enum.js';

export class CreateUploadSignatureDto {
  @ApiProperty({
    example: CloudinaryResourceType.VIDEO,
    enum: CloudinaryResourceType,
    description: 'The kind of file the frontend will upload',
  })
  @IsEnum(CloudinaryResourceType, {
    message: 'resourceType must be one of: image, video',
  })
  resourceType: CloudinaryResourceType;
}
