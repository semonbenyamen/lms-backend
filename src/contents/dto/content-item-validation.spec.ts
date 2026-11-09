import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';

import { MAX_VIDEO_DURATION_SECONDS } from './create-content-item.dto.js';
import { UpdateContentItemDto } from './update-content-item.dto.js';

const invalidFields = async (body: object): Promise<string[]> => {
  const errors = await validate(plainToInstance(UpdateContentItemDto, body));
  return errors.map((error) => error.property);
};

describe('UpdateContentItemDto', () => {
  it('should accept a partial update', async () => {
    expect(await invalidFields({ title: 'New title' })).toEqual([]);
  });

  it('should reject null for fields the database requires', async () => {
    expect(
      await invalidFields({
        title: null,
        contentType: null,
        orderIndex: null,
      }),
    ).toEqual(['title', 'contentType', 'orderIndex']);
  });

  it('should allow clearing optional fields with null', async () => {
    expect(await invalidFields({ durationSeconds: null })).toEqual([]);
  });

  it('should accept full http and https links', async () => {
    expect(
      await invalidFields({
        videoUrl: 'https://cdn.example.com/v.mp4',
        imageUrl: 'http://cdn.example.com/i.png',
      }),
    ).toEqual([]);
  });

  it('should reject links without a protocol or with another protocol', async () => {
    expect(
      await invalidFields({
        videoUrl: 'cdn.example.com/v.mp4',
        imageUrl: 'ftp://cdn.example.com/i.png',
      }),
    ).toEqual(['videoUrl', 'imageUrl']);
  });

  it('should reject a duration above the maximum', async () => {
    expect(
      await invalidFields({ durationSeconds: MAX_VIDEO_DURATION_SECONDS }),
    ).toEqual([]);
    expect(
      await invalidFields({ durationSeconds: MAX_VIDEO_DURATION_SECONDS + 1 }),
    ).toEqual(['durationSeconds']);
  });

  it('should accept an uploaded file public id', async () => {
    expect(
      await invalidFields({ mediaPublicId: 'lms/lessons/l-1/file-1' }),
    ).toEqual([]);
  });

  it('should reject an empty or too long public id', async () => {
    expect(await invalidFields({ mediaPublicId: '' })).toEqual([
      'mediaPublicId',
    ]);
    expect(await invalidFields({ mediaPublicId: 'a'.repeat(256) })).toEqual([
      'mediaPublicId',
    ]);
  });
});
