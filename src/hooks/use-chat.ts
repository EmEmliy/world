'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { getChatApiUrl } from '@/lib/chat-api';
import { resolveIncrementalVisibleText } from '@/lib/chat-stream';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const chatApiUrl = getChatApiUrl();
  // 用 ref 保持最新 messages 引用，避免 sendMessage 的陈旧闭包问题
  const messagesRef = useRef<Message[]>(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    // 先更新 ref，再 setMessages，确保后续读取时已是最新值
    const latestMessages = messagesRef.current;
    messagesRef.current = [...latestMessages, userMessage];
    setMessages(messagesRef.current);
    setIsLoading(true);

    // 取消上一个未完成的请求
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    try {
      const response = await fetch(chatApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // 使用 ref 里的最新 messages，避免闭包读到旧快照
          messages: messagesRef.current.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const assistantMessage: Message = {
        id: `${Date.now() + 1}`,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };

      messagesRef.current = [...messagesRef.current, assistantMessage];
      setMessages(messagesRef.current);

      const decoder = new TextDecoder();
      let assistantRaw = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const data = line.replace(/^data:\s?/, '');
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const delta = resolveIncrementalVisibleText(parsed, assistantRaw);
            if (delta) {
              assistantRaw += delta;
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMessage.id
                    ? { ...m, content: m.content + delta }
                    : m
                )
              );
            }
          } catch {
            // 忽略无效的 SSE 数据帧
          }
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        // 用户主动取消，不报错
        return;
      }
      console.error('Chat error:', e);
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [chatApiUrl]); // 消息状态通过 ref 读取，接口地址变化时重新绑定 sendMessage

  const clearMessages = useCallback(() => {
    messagesRef.current = [];
    setMessages([]);
  }, []);

  const stopGenerating = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    stopGenerating,
  };
}
