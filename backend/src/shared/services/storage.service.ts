/**
 * LOCAL DISK STORAGE SERVICE
 *
 * NOTE: This implementation stores files on local disk (under `uploads/`) and serves
 * them publicly. It strictly implements `IStorageService`, allowing a drop-in replacement
 * for AWS S3, Cloudflare R2, or Google Cloud Storage in production with zero caller changes.
 */

import fs from 'fs';
import path from 'path';

export interface UploadFileInput {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

export interface StorageUploadResult {
  url: string;
  key: string;
  filename: string;
  size: number;
  mimetype: string;
}

export interface IStorageService {
  uploadFile(file: UploadFileInput, folder?: string): Promise<StorageUploadResult>;
  getFile(key: string): Promise<Buffer | null>;
  deleteFile(key: string): Promise<boolean>;
  getPublicUrl(key: string): string;
}

export class LocalStorageService implements IStorageService {
  private baseUploadDir: string;

  constructor(customUploadDir?: string) {
    this.baseUploadDir = customUploadDir || path.resolve(__dirname, '../../../../uploads');
    this.ensureDirectoryExists(this.baseUploadDir);
  }

  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Upload a file buffer to disk under the specified sub-folder.
   */
  public async uploadFile(
    file: UploadFileInput,
    folder: string = 'general'
  ): Promise<StorageUploadResult> {
    const targetDir = path.join(this.baseUploadDir, folder);
    this.ensureDirectoryExists(targetDir);

    // Sanitize extension and generate unique filename
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const filename = `${uniqueSuffix}${ext}`;
    const filePath = path.join(targetDir, filename);

    // Write buffer to disk
    await fs.promises.writeFile(filePath, file.buffer);

    const key = `${folder}/${filename}`;
    const url = this.getPublicUrl(key);

    console.log(
      `📁 [LocalStorageService] File stored successfully: ${key} (${file.buffer.length} bytes) -> URL: ${url}`
    );

    return {
      url,
      key,
      filename,
      size: file.buffer.length,
      mimetype: file.mimetype,
    };
  }

  /**
   * Read file buffer by storage key
   */
  public async getFile(key: string): Promise<Buffer | null> {
    try {
      const filePath = path.join(this.baseUploadDir, key);
      if (!fs.existsSync(filePath)) {
        return null;
      }
      return await fs.promises.readFile(filePath);
    } catch {
      return null;
    }
  }

  /**
   * Delete a stored file by key
   */
  public async deleteFile(key: string): Promise<boolean> {
    try {
      const filePath = path.join(this.baseUploadDir, key);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Generate public URL for the file
   */
  public getPublicUrl(key: string): string {
    // Normalizes URL path with forward slashes
    const normalizedKey = key.replace(/\\/g, '/');
    return `/uploads/${normalizedKey}`;
  }
}

export const storageService: IStorageService = new LocalStorageService();
