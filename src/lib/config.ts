type ViteEnv = { VITE_API_BASE?: string };

function readEnv(): string {
  // Vite-style env (import.meta.env)
  const viteEnv = (import.meta as unknown as { env?: ViteEnv }).env;
  if (viteEnv?.VITE_API_BASE) return viteEnv.VITE_API_BASE;

  // Fallback if packaged with process.env available
  if (typeof process !== 'undefined' && (process as unknown as { env?: ViteEnv }).env?.VITE_API_BASE) {
    return (process as unknown as { env: ViteEnv }).env.VITE_API_BASE!;
  }
  return '';
}

const API = readEnv();

export const CONFIG = {
  API_BASE: API || 'http://localhost:3000',
  WS_URL:   API || 'http://localhost:3000',
};
