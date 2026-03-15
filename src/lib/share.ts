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
  
  return navigator.clipboard.writeText(text)
    .then(() => true)
    .catch(() => false);
}
