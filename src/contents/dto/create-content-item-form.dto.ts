import { ApiPropertyOptional } from '@nestjs/swagger';

import { CreateContentItemDto } from './create-content-item.dto.js';

// Swagger only: the create body as multipart form-data, with the optional file.
// Multer takes the file out of the body, so validation still uses CreateContentItemDto.
export class CreateContentItemFormDto extends CreateContentItemDto {
  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description:
      'Optional video (MP4, WebM) or image (JPG, PNG, WebP) file, up to 50 MB',
  })
  file?: unknown;
}
