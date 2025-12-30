export interface ImageCompressOptions {
  quality?: number;
  mimeType?: string;
}

const DEFAULT_QUALITY = 0.5;

export async function compressImages(
  files: File[],
  options: ImageCompressOptions = {}
): Promise<File[]> {
  const results: File[] = [];
  for (const file of files) {
    try {
      const compressed = await compressImageFile(file, options);
      results.push(compressed);
    } catch {
      results.push(file);
    }
  }
  return results;
}

export async function compressImageFile(
  file: File,
  options: ImageCompressOptions = {}
): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  if (file.type === 'image/gif') {
    return file;
  }

  const quality = typeof options.quality === 'number' ? options.quality : DEFAULT_QUALITY;
  const outputType = options.mimeType || (file.type === 'image/jpeg' || file.type === 'image/webp'
    ? file.type
    : 'image/jpeg');

  const image = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return file;
  }

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await canvasToBlob(canvas, outputType, quality);
  if (!blob) {
    return file;
  }

  const filename = outputType === file.type ? file.name : replaceExtension(file.name, outputType);
  return new File([blob], filename, { type: outputType, lastModified: Date.now() });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    const useQuality = type === 'image/jpeg' || type === 'image/webp';
    canvas.toBlob(
      (blob) => resolve(blob),
      type,
      useQuality ? quality : undefined
    );
  });
}

function replaceExtension(filename: string, mimeType: string): string {
  const base = filename.replace(/\.[^/.]+$/, '');
  const ext = mimeType === 'image/webp' ? 'webp' : 'jpg';
  return `${base}.${ext}`;
}
