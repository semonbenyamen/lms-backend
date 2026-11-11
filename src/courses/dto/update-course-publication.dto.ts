import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateCoursePublicationDto {
  @ApiProperty({
    example: true,
    description:
      'true publishes the course to the catalog, false takes it back to draft',
  })
  @IsBoolean()
  isPublished: boolean;

  @ApiPropertyOptional({
    example: true,
    description:
      'Only used when unpublishing: required when students are enrolled, because they lose access to the content until the course is published again',
  })
  @IsOptional()
  @IsBoolean()
  confirmUnpublishWithEnrollments?: boolean;
}
