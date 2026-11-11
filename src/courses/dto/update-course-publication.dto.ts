import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateCoursePublicationDto {
  @ApiProperty({
    example: true,
    description:
      'true publishes the course to the catalog, false takes it back to draft',
  })
  @IsBoolean()
  isPublished: boolean;
}
