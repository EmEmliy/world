type ShareImageCardOptions = {
  title: string;
  text?: string;
  fileName?: string;
  scale?: number;
  backgroundColor?: string | null;
  preferDownload?: boolean;
};

function sanitizeFileName(fileName: string) {
  return fileName
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function shareGame(title: string, text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.share) {
    return false;
  }

  try {
    await navigator.share({ title, text });
    return true;
  } catch (e) {
    if ((e as Error).name !== 'AbortError') {
      console.error('Share error:', e);
    }
    return false;
  }
}

export function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    return Promise.resolve(false);
  }

  return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
}

export async function shareImageCard(
  element: HTMLElement | null,
  options: ShareImageCardOptions
): Promise<boolean> {
  if (typeof window === 'undefined' || !element) {
    return false;
  }

  try {
    const html2canvasModule = await import('html2canvas');
    const canvas = await html2canvasModule.default(element, {
      backgroundColor: options.backgroundColor ?? null,
      scale: options.scale ?? Math.min(window.devicePixelRatio || 1, 2),
      useCORS: true,
      logging: false,
      removeContainer: true,
    });

    const blob = await canvasToBlob(canvas);
    if (!blob) {
      return false;
    }

    const fileName = sanitizeFileName(options.fileName ?? `${options.title}.png`) || 'story-card.png';
    const file = new File([blob], fileName, { type: 'image/png' });

    if (options.preferDownload) {
      triggerDownload(blob, fileName);
      return true;
    }

    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        await navigator.share({
          title: options.title,
          text: options.text,
          files: [file],
        });
        return true;
      } catch (shareError) {
        if ((shareError as Error).name !== 'AbortError') {
          console.error('Image share error:', shareError);
          triggerDownload(blob, fileName);
          return true;
        }
        return false;
      }
    }

    triggerDownload(blob, fileName);
    return true;
  } catch (e) {
    console.error('Image share error:', e);
    return false;
  }
}
