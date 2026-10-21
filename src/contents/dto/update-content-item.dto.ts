import { PartialType } from '@nestjs/swagger';
import { CreateContentItemDto } from './create-content-item.dto.js';

export class UpdateContentItemDto extends PartialType(CreateContentItemDto) {}
