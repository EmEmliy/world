'use client';

import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { NPC_CONFIG, QUEST_CONFIG, MENU } from '@/config/game';
import { track } from '@/lib/tracker';
import { getChatApiUrl } from '@/lib/chat-api';
import { CrayfishAvatar, getCrayfishVariant } from '@/components/game/crayfish-avatar';
import { QuestProgress } from '@/components/game/quest-progress';
import { RewardModal } from '@/components/game/reward-modal';

export default function ShopPage() {
  const [messages, setMessages] = useState<Array<{role: string; content: string}>>([
    { role: 'assistant', content: NPC_CONFIG.greeting }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [questProgress, setQuestProgress] = useState(0);
  const [showReward, setShowReward] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    track('page_view', { page: 'shop_xiaomei' });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    const messagesToSend = [...messages, { role: 'user', content: userMessage }];

    try {
      const response = await fetch(getChatApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesToSend
        }),
      });

      if (!response.ok) throw new Error('Failed to send');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content || '';
                if (content) {
                  assistantMessage += content;
                  const filteredContent = assistantMessage
                    .replace(/<think>[\s\S]*?<\/think>/gi, '')
                    .replace(/<think>[\s\S]*?/gi, '')
                    .replace(/<\/think>/gi, '');
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = { role: 'assistant', content: filteredContent };
                    return newMessages;
                  });
                }
              } catch {}
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，出现了一些问题...' }]);
    } finally {
      setIsLoading(false);
      const newProgress = Math.min(questProgress + 10, 100);
      setQuestProgress(newProgress);
      if (newProgress >= 100) {
        setShowReward(true);
      }
    }
  };

  const points = Math.floor(questProgress * 3);
  const crayfishVariant = getCrayfishVariant(points);

  return (
    <main className="min-h-screen flex flex-col max-w-md mx-auto relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-b from-[#87CEEB] via-[#98FB98] to-[#F4A460] -z-10">
        <div className="absolute top-4 left-4 text-4xl">☁️</div>
        <div className="absolute top-8 right-8 text-3xl">🌴</div>
        <div className="absolute bottom-20 left-8 text-3xl">🐚</div>
        <div className="absolute bottom-32 right-4 text-2xl">🦀</div>
      </div>

      <header className="bg-white/80 backdrop-blur-sm shadow-sm p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/island" className="text-[#4A3728] text-xl">←</Link>
          <CrayfishAvatar variant={crayfishVariant} size="sm" />
          <div>
            <h1 className="text-xl font-bold text-[#4A3728]">{NPC_CONFIG.shopName}</h1>
            <p className="text-sm text-[#4A3728]/60">和{NPC_CONFIG.name}聊聊</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => {
          const rawContent = msg.content;
          const displayContent = msg.role === 'assistant' 
            ? rawContent
                .replace(/<think>[\s\S]*?<\/think>/gi, '')
                .replace(/<think>[\s\S]*?/gi, '')
                .replace(/<\/think>/gi, '')
                .replace(/<think>/gi, '')
                .trim()
            : msg.content;
          
          if (!displayContent) return null;
          
          return (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-2 rounded-2xl whitespace-pre-wrap ${
                msg.role === 'user' 
                  ? 'bg-[#FF6B35] text-white rounded-br-md' 
                  : 'bg-[#FFF3CD] text-[#4A3728] rounded-bl-md'
              }`}>
                {displayContent}
              </div>
            </div>
          );
        })}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#FFF3CD] px-4 py-3 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-[#4A3728]/40 rounded-full animate-pulse" style={{ animationDelay: '0s' }} />
                <span className="w-2 h-2 bg-[#4A3728]/40 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                <span className="w-2 h-2 bg-[#4A3728]/40 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white/90 backdrop-blur-sm p-4 shadow-sm">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="发送消息..."
            className="flex-1 border border-[#4A3728]/20 rounded-full px-4 py-2 outline-none focus:border-[#FF6B35]"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-[#FF6B35] text-white px-4 py-2 rounded-full disabled:opacity-50"
          >
            发送
          </button>
        </div>
      </div>

      {questProgress > 0 && (
        <QuestProgress progress={questProgress} />
      )}

      <RewardModal 
        isOpen={showReward} 
        shopName={NPC_CONFIG.shopName}
        onClose={() => setShowReward(false)} 
      />
    </main>
  );
}
