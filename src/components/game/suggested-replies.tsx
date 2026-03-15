'use client';

interface SuggestedRepliesProps {
  replies: string[];
  onSelect: (reply: string) => void;
}

export function SuggestedReplies({ replies, onSelect }: SuggestedRepliesProps) {
  if (!replies.length) return null;

  return (
    <div className="flex gap-2 flex-wrap mb-4">
      {replies.map((reply, i) => (
        <button
          key={i}
          onClick={() => onSelect(reply)}
          className="px-4 py-2 bg-white border border-primary/30 rounded-full text-sm text-text hover:bg-primary/10 transition-colors"
        >
          {reply}
        </button>
      ))}
    </div>
  );
}
