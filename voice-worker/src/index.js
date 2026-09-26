import { GoogleGenAI, Modality } from '@google/genai';
import { SYSTEM_INSTRUCTION } from './context.js';

const MODEL = 'gemini-3.8-live';

// Hard ceiling on one conversation. At $0.005/min in + $0.018/min out this
// caps a single session at roughly $0.12.
const SESSION_MINUTES = 5;
// The browser must open the WebSocket within this window after fetching.
const CONNECT_WINDOW_SECONDS = 60;
// Must match the `action` the page renders the Turnstile widget with.
const TURNSTILE_ACTION = 'voice';

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

    if (!env.GEMINI_API_KEY || !env.TURNSTILE_SECRET) return json({ error: 'not_configured' }, 500, cors);

    // Bot check before anything that costs money. The rate limit alone is
    // per IP, which a script can rotate around; Turnstile needs a real browser.
    const form = await request.formData().catch(() => null);
    const challenge = form && form.get('turnstile');
    if (!(await verifyTurnstile(challenge, request, env))) {
      return json({ error: 'challenge_failed' }, 403, cors);
    }

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

async function verifyTurnstile(token, request, env) {
  const hostnames = new Set(
    (env.TURNSTILE_HOSTNAMES || '').split(',').map((h) => h.trim()).filter(Boolean),
  );
  if (typeof token !== 'string' || token.length === 0 || token.length > 2048 || hostnames.size === 0) {
    return false;
  }
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(10_000),
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET,
        response: token,
        remoteip: request.headers.get('CF-Connecting-IP') || '',
      }),
    });
    if (!res.ok) return false;
    const result = await res.json();
    return result.success === true && result.action === TURNSTILE_ACTION && hostnames.has(result.hostname);
  } catch (err) {
    // Network error or bad response from siteverify: fail closed.
    console.error('siteverify failed', err);
    return false;
  }
}

function json(body, status, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
