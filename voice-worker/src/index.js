import { GoogleGenAI, Modality } from '@google/genai';
import { SYSTEM_INSTRUCTION } from './context.js';

const MODEL = 'gemini-3.8-live';

// Hard ceiling on one conversation. At $0.005/min in + $0.018/min out this
// caps a single session at roughly $0.12.
const SESSION_MINUTES = 5;
// The browser must open the WebSocket within this window after fetching.
const CONNECT_WINDOW_SECONDS = 60;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
    const cors = allowed.includes(origin)
      ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' }
      : null;

    const url = new URL(request.url);
    if (url.pathname !== '/token') return json({ error: 'not_found' }, 404);
    if (!cors) return json({ error: 'forbidden_origin' }, 403);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: { ...cors, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Max-Age': '86400' },
      });
    }
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, cors);

    if (env.TOKEN_LIMITER) {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const { success } = await env.TOKEN_LIMITER.limit({ key: ip });
      if (!success) return json({ error: 'rate_limited' }, 429, cors);
    }

    if (!env.GEMINI_API_KEY) return json({ error: 'not_configured' }, 500, cors);

    try {
      const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
      const now = Date.now();
      const token = await ai.authTokens.create({
        config: {
          uses: 1,
          expireTime: new Date(now + SESSION_MINUTES * 60_000).toISOString(),
          newSessionExpireTime: new Date(now + CONNECT_WINDOW_SECONDS * 1000).toISOString(),
          // Locks the persona server-side: whatever the browser sends in its
          // setup message, the session runs with this model and these
          // instructions, so the token can't be repurposed as a free
          // general-purpose assistant.
          liveConnectConstraints: {
            model: MODEL,
            config: {
              responseModalities: [Modality.AUDIO],
              systemInstruction: SYSTEM_INSTRUCTION,
              inputAudioTranscription: {},
              outputAudioTranscription: {},
            },
          },
          lockAdditionalFields: [],
          httpOptions: { apiVersion: 'v1beta' },
        },
      });

      return json({ token: token.name, model: MODEL, expiresInSeconds: SESSION_MINUTES * 60 }, 200, {
        ...cors,
        'Cache-Control': 'no-store',
      });
    } catch (err) {
      console.error('token creation failed', err);
      return json({ error: 'upstream_error' }, 502, cors);
    }
  },
};

function json(body, status, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
