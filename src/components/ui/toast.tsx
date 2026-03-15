'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  return (
    <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 ${bgColors[type]} text-white px-4 py-3 rounded-full shadow-lg flex items-center gap-2 z-50 animate-slide-up`}>
      <span>{message}</span>
      <button onClick={onClose} className="hover:opacity-80">
        <X size={16} />
      </button>
    </div>
  );
}
