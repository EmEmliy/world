interface TrackEvent {
  event: string;
  data?: Record<string, unknown>;
}

export async function track(event: string, data?: Record<string, unknown>): Promise<void> {
  try {
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, ...data }),
    });
  } catch (e) {
    console.error('Track error:', e);
  }
}

export function trackPageView(page: string): void {
  track('page_view', { page });
}

export function trackAction(action: string, data?: Record<string, unknown>): void {
  track('action', { action, ...data });
}

export function trackDuration(page: string) {
  const startTime = Date.now();
  
  return function cleanup() {
    const duration = Date.now() - startTime;
    track('page_duration', { page, duration });
  };
}
