/**
 * "Talk to my AI" - voice assistant over the Gemini Live API.
 *
 * Flow: click -> fetch a single-use ephemeral token from the Cloudflare
 * Worker (voice-worker/) -> open a WebSocket straight to Gemini -> stream the
 * microphone up as PCM16 and play the PCM16 replies back. The persona and
 * the portfolio facts are locked into the token by the Worker, so nothing
 * here can change what the assistant knows or says.
 */
(function () {
  "use strict";

  // voice-worker/ deployed with `npm run deploy`. Keep in sync with the CSP
  // connect-src in index.html.
  const TOKEN_URL = 'https://portfolio-voice.bakame03.workers.dev/token';
  const LIVE_URL = 'wss://generativelanguage.googleapis.com/ws/' +
    'google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained';

  const root = document.getElementById('voice');
  if (!root) return;
  const toggle = document.getElementById('voiceToggle');
  const toggleIcon = toggle.querySelector('i');
  const toggleLabel = toggle.querySelector('.voice__label');
  const panel = document.getElementById('voicePanel');
  const statusEl = document.getElementById('voiceStatus');
  const transcript = document.getElementById('voiceTranscript');

  const supported = !!(window.WebSocket && window.AudioContext && window.AudioWorkletNode &&
    navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  function t(key, fallback) {
    const dict = window.translations && window.translations[document.documentElement.lang];
    return (dict && dict[key]) || fallback;
  }

  // ---- UI state ---------------------------------------------------------
  // idle | connecting | listening | speaking
  let state = 'idle';
  let statusKey = null;

  function render() {
    const active = state !== 'idle';
    root.dataset.state = state;
    document.body.classList.toggle('voice-open', !panel.hidden);
    toggle.setAttribute('aria-pressed', String(active));
    toggleIcon.className = active ? 'bi bi-stop-fill' : 'bi bi-mic-fill';
    toggleLabel.textContent = active ? t('voice_end', 'End') : t('voice_cta', 'Talk to my AI');
    statusEl.textContent = statusKey ? t(statusKey[0], statusKey[1]) : '';
  }

  function setState(next, key, fallback) {
    state = next;
    if (key) statusKey = [key, fallback];
    render();
  }

  // Labels are set from JS, so follow language switches made by main.js.
  new MutationObserver(render).observe(document.documentElement, {
    attributes: true, attributeFilter: ['lang']
  });

  // Transcription arrives in small fragments; keep appending to the current
  // line until the other side starts talking.
  let line = null;
  function appendTranscript(role, text) {
    if (!text) return;
    if (!line || line.dataset.role !== role) {
      line = document.createElement('p');
      line.className = 'voice__line voice__line--' + role;
      line.dataset.role = role;
      const who = document.createElement('strong');
      who.textContent = role === 'user' ? t('voice_you', 'You') : t('voice_ai', 'AI');
      line.append(who, ' ');
      transcript.append(line);
    }
    line.append(text);
    transcript.scrollTop = transcript.scrollHeight;
  }

  // ---- Session ----------------------------------------------------------
  let session = null;

  async function start() {
    panel.hidden = false;
    transcript.textContent = '';
    line = null;

    if (!supported) {
      setState('idle', 'voice_err_unsupported', "Your browser doesn't support voice chat.");
      return;
    }
    setState('connecting', 'voice_connecting', 'Connecting...');

    // Created synchronously inside the click so browsers allow audio output.
    const s = session = {
      ctx: new AudioContext(),
      ws: null,
      stream: null,
      sources: new Set(),
      playhead: 0,
      closing: false
    };

    try {
      const [grant, stream] = await Promise.all([fetchToken(), getMicrophone()]);
      if (session !== s) { stream.getTracks().forEach(tr => tr.stop()); return; }
      s.stream = stream;
      await s.ctx.audioWorklet.addModule('assets/js/voice-capture.worklet.js');
      if (session !== s) return;
      openSocket(s, grant);
    } catch (err) {
      if (session !== s) return;
      console.warn('voice: start failed', err);
      stop(err.statusKey || ['voice_err_generic', 'The assistant is unavailable right now.']);
    }
  }

  async function fetchToken() {
    let res;
    try {
      res = await fetch(TOKEN_URL, { method: 'POST' });
    } catch (e) {
      throw withStatus(e, 'voice_err_generic', 'The assistant is unavailable right now.');
    }
    if (res.status === 429) {
      throw withStatus(new Error('rate limited'), 'voice_err_busy', 'Too many requests - try again in a minute.');
    }
    if (!res.ok) {
      throw withStatus(new Error('token ' + res.status), 'voice_err_generic', 'The assistant is unavailable right now.');
    }
    return res.json();
  }

  async function getMicrophone() {
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
    } catch (e) {
      throw withStatus(e, 'voice_err_mic', 'Microphone access was denied.');
    }
  }

  function withStatus(err, key, fallback) {
    err.statusKey = [key, fallback];
    return err;
  }

  function openSocket(s, grant) {
    const ws = s.ws = new WebSocket(LIVE_URL + '?access_token=' + encodeURIComponent(grant.token));

    ws.onopen = () => {
      // Persona and transcription come from the token's locked config.
      send(s, { setup: { model: 'models/' + grant.model } });
    };

    // Decoded synchronously: awaiting Blob.text() lets frames resolve out of
    // order, which would scramble the audio chunks.
    ws.binaryType = 'arraybuffer';
    const decoder = new TextDecoder();
    ws.onmessage = (event) => {
      if (session !== s) return;
      const raw = typeof event.data === 'string' ? event.data : decoder.decode(event.data);
      let msg;
      try { msg = JSON.parse(raw); } catch (e) { return; }
      handleMessage(s, msg);
    };

    ws.onclose = (event) => {
      if (session !== s || s.closing) return;
      if (event.code !== 1000) console.warn('voice: socket closed', event.code, event.reason);
      stop(event.code === 1000
        ? ['voice_ended', 'Conversation ended.']
        : ['voice_err_generic', 'The assistant is unavailable right now.']);
    };
  }

  function handleMessage(s, msg) {
    if (msg.setupComplete) {
      startCapture(s);
      // Nudge the model into its greeting so the visitor isn't met by silence.
      send(s, {
        clientContent: {
          turns: [{ role: 'user', parts: [{ text: document.documentElement.lang === 'fr' ? 'Bonjour' : 'Hello' }] }],
          turnComplete: true
        }
      });
      setState('listening', 'voice_listening', 'Listening - go ahead and speak.');
      return;
    }

    const content = msg.serverContent;
    if (!content) return;

    if (content.interrupted) stopPlayback(s);

    const parts = (content.modelTurn && content.modelTurn.parts) || [];
    parts.forEach(part => {
      if (part.inlineData && /^audio\/pcm/.test(part.inlineData.mimeType || '')) {
        const rate = Number((/rate=(\d+)/.exec(part.inlineData.mimeType) || [])[1]) || 24000;
        play(s, part.inlineData.data, rate);
      }
    });

    if (content.inputTranscription) appendTranscript('user', content.inputTranscription.text);
    if (content.outputTranscription) appendTranscript('ai', content.outputTranscription.text);
  }

  function send(s, msg) {
    if (s.ws && s.ws.readyState === WebSocket.OPEN) s.ws.send(JSON.stringify(msg));
  }

  // ---- Audio in ---------------------------------------------------------
  // Sent at the context's native rate (usually 48 kHz); the Live API
  // resamples anything tagged with its rate.
  function startCapture(s) {
    const node = new AudioWorkletNode(s.ctx, 'voice-capture');
    const mimeType = 'audio/pcm;rate=' + s.ctx.sampleRate;
    node.port.onmessage = (event) => {
      if (session !== s) return;
      send(s, { realtimeInput: { audio: { mimeType, data: floatToPcm16Base64(event.data) } } });
    };
    s.ctx.createMediaStreamSource(s.stream).connect(node);
  }

  function floatToPcm16Base64(samples) {
    const pcm = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      const v = Math.max(-1, Math.min(1, samples[i]));
      pcm[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
    }
    const bytes = new Uint8Array(pcm.buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
  }

  // ---- Audio out --------------------------------------------------------
  // Each chunk becomes an AudioBuffer at the model's rate (24 kHz); the
  // browser resamples on playback. Chunks are queued back to back on a
  // playhead so they join without gaps.
  function play(s, base64, rate) {
    const binary = atob(base64);
    const pcm = new Int16Array(binary.length >> 1);
    for (let i = 0; i < pcm.length; i++) {
      pcm[i] = binary.charCodeAt(2 * i) | (binary.charCodeAt(2 * i + 1) << 8);
    }
    if (!pcm.length) return;

    const buffer = s.ctx.createBuffer(1, pcm.length, rate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) channel[i] = pcm[i] / 32768;

    const src = s.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(s.ctx.destination);
    const at = Math.max(s.playhead, s.ctx.currentTime + 0.03);
    src.start(at);
    s.playhead = at + buffer.duration;
    s.sources.add(src);
    src.onended = () => {
      s.sources.delete(src);
      if (!s.sources.size && session === s) setState('listening', 'voice_listening', 'Listening - go ahead and speak.');
    };
    if (state !== 'speaking') setState('speaking', 'voice_speaking', 'Speaking...');
  }

  // The visitor talked over the model: drop whatever is still queued.
  function stopPlayback(s) {
    s.sources.forEach(src => { src.onended = null; try { src.stop(); } catch (e) {} });
    s.sources.clear();
    s.playhead = 0;
    if (session === s) setState('listening', 'voice_listening', 'Listening - go ahead and speak.');
  }

  function stop(status) {
    const s = session;
    session = null;
    if (s) {
      s.closing = true;
      stopPlayback(s);
      if (s.ws && s.ws.readyState <= WebSocket.OPEN) s.ws.close(1000);
      if (s.stream) s.stream.getTracks().forEach(tr => tr.stop());
      s.ctx.close().catch(() => {});
    }
    setState('idle', status && status[0], status && status[1]);
  }

  toggle.addEventListener('click', () => {
    if (state === 'idle') start();
    else stop(['voice_ended', 'Conversation ended.']);
  });

  document.getElementById('voiceClose').addEventListener('click', () => {
    if (state !== 'idle') stop();
    panel.hidden = true;
    statusKey = null;
    render();
    toggle.focus();
  });

  // Never keep the microphone open on a page the visitor has left.
  window.addEventListener('pagehide', () => { if (session) stop(); });

  render();
})();
