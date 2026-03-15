'use client';

export function Skeleton() {
  return (
    <div className="flex justify-start mb-4">
      <div className="bg-bubble-npc px-4 py-3 rounded-2xl rounded-bl-md w-48">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-text/20 rounded w-3/4" />
          <div className="h-4 bg-text/20 rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}
