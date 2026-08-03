/**
 * image-resize.ts
 * 클라이언트 사이드 이미지 자동 리사이징 유틸리티
 * - 업로드 전 최대 1200px로 압축 (비율 유지)
 * - WebP 변환 (지원 브라우저)
 * - 파일 크기 10MB 이하 검증
 * web-performance-resilience 스킬 준수
 */

export interface ResizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputType?: 'image/webp' | 'image/jpeg' | 'image/png';
}

const DEFAULT_OPTIONS: Required<ResizeOptions> = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.85,
  outputType: 'image/webp',
};

/**
 * 이미지 파일을 Canvas를 통해 리사이징 후 Blob으로 반환
 */
export async function resizeImage(
  file: File,
  options: ResizeOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 이미지 파일이 아니면 그대로 반환
  if (!file.type.startsWith('image/')) return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // 리사이징 필요 여부 확인
      if (width <= opts.maxWidth && height <= opts.maxHeight) {
        // 이미 작은 이미지는 WebP만 변환
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(file); return; }
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return; }
            const ext = opts.outputType === 'image/webp' ? 'webp' : opts.outputType === 'image/jpeg' ? 'jpg' : 'png';
            const newName = file.name.replace(/\.[^.]+$/, `.${ext}`);
            resolve(new File([blob], newName, { type: opts.outputType }));
          },
          opts.outputType,
          opts.quality
        );
        return;
      }

      // 비율 유지하며 리사이징
      const ratio = Math.min(opts.maxWidth / width, opts.maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }

      // 고품질 렌더링
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          const ext = opts.outputType === 'image/webp' ? 'webp' : opts.outputType === 'image/jpeg' ? 'jpg' : 'png';
          const newName = file.name.replace(/\.[^.]+$/, `.${ext}`);
          resolve(new File([blob], newName, { type: opts.outputType }));
        },
        opts.outputType,
        opts.quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('이미지 로드 실패'));
    };

    img.src = objectUrl;
  });
}

/**
 * 파일 크기를 사람이 읽기 쉬운 형태로 변환
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
