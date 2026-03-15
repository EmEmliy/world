'use client';

export function Thinking() {
  return (
    <div className="flex justify-start mb-4">
      <div className="bg-bubble-npc px-4 py-3 rounded-2xl rounded-bl-md">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-text/40 rounded-full animate-pulse-dot" style={{ animationDelay: '0s' }} />
          <span className="w-2 h-2 bg-text/40 rounded-full animate-pulse-dot" style={{ animationDelay: '0.2s' }} />
          <span className="w-2 h-2 bg-text/40 rounded-full animate-pulse-dot" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  );
}
