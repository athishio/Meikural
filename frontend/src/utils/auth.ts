/**
 * auth.ts - Client-side administrative API key resolver
 * Resolves API key from server-injected window variable, localStorage, or fallback.
 */

export const getClientApiKey = (): string => {
  if (typeof window !== 'undefined') {
    if ((window as any).__MEIKURAL_API_KEY__) {
      return (window as any).__MEIKURAL_API_KEY__;
    }
    const stored = localStorage.getItem('meikural_api_key');
    if (stored) return stored;
  }
  return 'meikural-dev-key-2026';
};
