import { describe, it, expect, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import { LocalStorageService } from '../storage.service';

describe('StorageService', () => {
  const testUploadDir = path.resolve(__dirname, '../../../../uploads/test-temp');
  const storageService = new LocalStorageService(testUploadDir);

  afterAll(async () => {
    // Cleanup temporary test directory
    if (fs.existsSync(testUploadDir)) {
      await fs.promises.rm(testUploadDir, { recursive: true, force: true });
    }
  });

  it('should upload a file and return public URL', async () => {
    const fileBuffer = Buffer.from('fake-image-binary-data');
    const result = await storageService.uploadFile(
      {
        buffer: fileBuffer,
        originalname: 'selfie.png',
        mimetype: 'image/png',
      },
      'selfies'
    );

    expect(result.url).toBeDefined();
    expect(result.url.startsWith('/uploads/selfies/')).toBe(true);
    expect(result.key.startsWith('selfies/')).toBe(true);
    expect(result.size).toBe(fileBuffer.length);

    // Verify file content can be read back
    const retrievedBuffer = await storageService.getFile(result.key);
    expect(retrievedBuffer).not.toBeNull();
    expect(retrievedBuffer?.toString()).toBe('fake-image-binary-data');

    // Delete file
    const deleted = await storageService.deleteFile(result.key);
    expect(deleted).toBe(true);
  });

  it('should return null for non-existent file key', async () => {
    const file = await storageService.getFile('non-existent/file.jpg');
    expect(file).toBeNull();
  });
});
