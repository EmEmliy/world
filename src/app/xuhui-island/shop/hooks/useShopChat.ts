'use client';

import { useState, useRef, useCallback } from 'react';
import type { ChatMessage } from '../types/shop-types';
import type { XuhuiShop } from '@/config/xuhui-shops';
import { getChatApiUrl } from '@/lib/chat-api';

export function useShopChat(shop: XuhuiShop | undefined, shopId: string) {
  const [selectedActorId, setSelectedActorId] = useState('owner-0');
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [streamingActorId, setStreamingActorId] = useState<string | null>(null);
  const [chatMessagesByActor, setChatMessagesByActor] = useState<Record<string, ChatMessage[]>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = sessionStorage.getItem(`world:chat:${shopId}`);
      return raw ? (JSON.parse(raw) as Record<string, ChatMessage[]>) : {};
    } catch {
      return {};
    }
  });
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const sendChat = useCallback(async (actorId: string, _actor: any, _psNapshot: any, systemPrompt: string) => {
    if (!shop || !chatInput.trim()) return;
    const message: ChatMessage = { role: 'user', content: chatInput };
    setChatMessagesByActor(prev => {
      const next = { ...prev, [actorId]: [...(prev[actorId] || []), message] };
      sessionStorage.setItem(`world:chat:${shopId}`, JSON.stringify(next));
      return next;
    });
    setChatInput('');
    setChatLoading(true);
    setStreamingActorId(actorId);
    try {
      const res = await fetch(getChatApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [systemPrompt, message] }),
      });
      const data = await res.json();
      const assistantMessage: ChatMessage = { role: 'assistant', content: data.result || '策状�;全餽Ӧ�吭' };
      setChatMessagesByActor(prev => {
        const next = { ...prev, [actorId]: [...(prev[actorId] || []), assistantMessage] };
        sessionStorage.setItem(`world:chat:${shopId}`, JSON.stringify(next));
        return next;
      });
    } catch (e) {
      console.error('Chat error:', e);
    } finally {
      setChatLoading(false);
      setStreamingActorId(null);
    }
  }, [shop, chatInput]);

  return {
    selectedActorId,
    setSelectedActorId,
    chatInput,
    setChatInput,
    chatLoading,
    setChatLoading,
    streamingActorId,
    setStreamingActorId,
    chatMessagesByActor,
    setChatMessagesByActor,
    chatScrollRef,
    sendChat,
  };
}
