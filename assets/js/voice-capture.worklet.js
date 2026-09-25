// Runs on the audio thread. Collects mono microphone samples into ~100 ms
// chunks and hands them to voice.js, which encodes and streams them.
class VoiceCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // `sampleRate` is the AudioContext's rate (a worklet global).
    this.buffer = new Float32Array(Math.round(sampleRate / 10));
    this.length = 0;
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel) return true;

    let offset = 0;
    while (offset < channel.length) {
      const n = Math.min(channel.length - offset, this.buffer.length - this.length);
      this.buffer.set(channel.subarray(offset, offset + n), this.length);
      this.length += n;
      offset += n;
      if (this.length === this.buffer.length) {
        this.port.postMessage(this.buffer.slice(0));
        this.length = 0;
      }
    }
    return true;
  }
}

registerProcessor('voice-capture', VoiceCaptureProcessor);
