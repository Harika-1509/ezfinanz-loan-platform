/**
 * Client-Side Image Compression & Resizing Utility
 *
 * Scales down large mobile/webcam photos (e.g. 12MP/4K phone camera photos >5-10MB)
 * to a standard bounding box (default 1024x1024) at 0.8 JPEG quality.
 * Reduces payload size to ~100-250KB while maintaining clear biometric and OCR readability.
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
}

/**
 * Loads an image source (File or Data URL) into an HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load image for compression: ' + e));
    img.src = src;
  });
}

/**
 * Compresses an image File or Base64 data URL via an off-screen HTML5 Canvas.
 */
export async function compressImage(
  source: File | string,
  options: CompressOptions = {}
): Promise<{
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
}> {
  const {
    maxWidth = 1024,
    maxHeight = 1024,
    quality = 0.82,
    mimeType = 'image/jpeg',
  } = options;

  let originalDataUrl = '';
  let originalSize = 0;

  if (typeof source === 'string') {
    originalDataUrl = source;
    originalSize = Math.round((source.length * 3) / 4);
  } else {
    originalSize = source.size;
    originalDataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(source);
    });
  }

  const img = await loadImage(originalDataUrl);

  // Calculate proportional dimensions
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  if (width > maxWidth || height > maxHeight) {
    if (width > height) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    } else {
      width = Math.round((width * maxHeight) / height);
      height = maxHeight;
    }
  }

  // Draw onto canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available for image compression');
  }

  // Draw background white in case of transparent PNG
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  ctx.drawImage(img, 0, 0, width, height);

  const compressedDataUrl = canvas.toDataURL(mimeType, quality);

  // Convert to Blob
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (b) => resolve(b || new Blob()),
      mimeType,
      quality
    );
  });

  return {
    dataUrl: compressedDataUrl,
    blob,
    width,
    height,
    originalSize,
    compressedSize: blob.size || Math.round((compressedDataUrl.length * 3) / 4),
  };
}
