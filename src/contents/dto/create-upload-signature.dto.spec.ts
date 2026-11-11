import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';

import { CloudinaryResourceType } from '../../common/enums/cloudinary-resource-type.enum.js';
import { CreateUploadSignatureDto } from './create-upload-signature.dto.js';

describe('CreateUploadSignatureDto', () => {
  const invalidFields = async (body: object): Promise<string[]> => {
    const errors = await validate(
      plainToInstance(CreateUploadSignatureDto, body),
    );
    return errors.map((error) => error.property);
  };

  it('should accept an image or a video', async () => {
    expect(
      await invalidFields({ resourceType: CloudinaryResourceType.IMAGE }),
    ).toEqual([]);
    expect(
      await invalidFields({ resourceType: CloudinaryResourceType.VIDEO }),
    ).toEqual([]);
  });

  it('should reject a missing or unknown resource type', async () => {
    expect(await invalidFields({})).toEqual(['resourceType']);
    expect(await invalidFields({ resourceType: 'raw' })).toEqual([
      'resourceType',
    ]);
  });
});
