const DEFAULT_CHAT_API_PATH = '/api/chat';

export function getChatApiUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_CHAT_API_URL?.trim();
  return configuredUrl && configuredUrl.length > 0
    ? configuredUrl
    : DEFAULT_CHAT_API_PATH;
}
