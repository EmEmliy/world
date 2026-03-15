'use client';

import { useEffect, useState } from 'react';

interface PageTrackerProps {
  page: string;
}

export function PageTracker({ page }: PageTrackerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'page_view', page }),
    }).catch(() => {});
  }, [page, mounted]);

  return null;
}
