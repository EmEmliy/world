'use client';

interface ChatBubbleProps {
  content: string;
  role: 'user' | 'assistant';
}

export function ChatBubble({ content, role }: ChatBubbleProps) {
  const isUser = role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] px-4 py-2 rounded-2xl ${
          isUser 
            ? 'bg-primary text-white rounded-br-md' 
            : 'bg-bubble-npc text-text rounded-bl-md'
        }`}
      >
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}
