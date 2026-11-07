import { describe, expect, it } from 'vitest';

import { ContentType } from '../common/enums/content-type.enum.js';
import { getTypeFieldError, pickTypeFields } from './content-type-fields.js';

describe('getTypeFieldError', () => {
  it('requires the field of each type', () => {
    expect(getTypeFieldError(ContentType.TEXT, { bodyText: '  ' })).toBe(
      'bodyText is required for text content',
    );
    expect(getTypeFieldError(ContentType.VIDEO, {})).toBe(
      'videoUrl is required for video content',
    );
    expect(getTypeFieldError(ContentType.IMAGE, {})).toBe(
      'imageUrl is required for image content',
    );
  });

  it('accepts the field of each type', () => {
    expect(getTypeFieldError(ContentType.TEXT, { bodyText: 'Hi' })).toBeNull();
    expect(
      getTypeFieldError(ContentType.VIDEO, {
        videoUrl: 'https://example.com/v.mp4',
      }),
    ).toBeNull();
    expect(
      getTypeFieldError(ContentType.IMAGE, {
        imageUrl: 'https://example.com/i.png',
      }),
    ).toBeNull();
  });
});

describe('pickTypeFields', () => {
  it('keeps a video transcript in bodyText', () => {
    expect(
      pickTypeFields(ContentType.VIDEO, {
        bodyText: 'Transcript',
        videoUrl: 'https://example.com/v.mp4',
        imageUrl: 'https://example.com/old.png',
      }),
    ).toEqual({
      bodyText: 'Transcript',
      videoUrl: 'https://example.com/v.mp4',
      imageUrl: null,
    });
  });

  it('clears the fields of other types', () => {
    expect(
      pickTypeFields(ContentType.IMAGE, {
        bodyText: 'old text',
        imageUrl: 'https://example.com/i.png',
      }),
    ).toEqual({
      bodyText: null,
      videoUrl: null,
      imageUrl: 'https://example.com/i.png',
    });
  });

  it('trims the text body', () => {
    expect(pickTypeFields(ContentType.TEXT, { bodyText: '  Hello ' })).toEqual(
      { bodyText: 'Hello', videoUrl: null, imageUrl: null },
    );
  });
});
