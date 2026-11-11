import { CloudinaryResourceType } from '../enums/cloudinary-resource-type.enum.js';

const MB = 1024 * 1024;

export interface UploadRule {
  formats: string[];
  maxBytes: number;
}

// Limits live here only, so a new plan or provider changes one place.
export const UPLOAD_RULES: Record<CloudinaryResourceType, UploadRule> = {
  [CloudinaryResourceType.IMAGE]: {
    formats: ['jpg', 'jpeg', 'png', 'webp'],
    maxBytes: 10 * MB,
  },
  [CloudinaryResourceType.VIDEO]: {
    formats: ['mp4', 'webm'],
    maxBytes: 1024 * MB,
  },
};
