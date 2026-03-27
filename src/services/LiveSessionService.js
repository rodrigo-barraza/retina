// ============================================================
// LiveSessionService — Manages persistent Live API sessions
// ============================================================
// Handles bidirectional audio/text streaming with Prism's /ws/live
// endpoint, which proxies to Google's Gemini Live API.
// ============================================================

import { PRISM_WS_URL } from "../../config.js";

const LIVE_WS_URL = `${PRISM_WS_URL}/ws/live?project=retina&username=default`;

/**
 * Singleton-like service for managing a Live API WebSocket session.
 *
 * Usage:
 *   const session = new LiveSessionService();
 *   session.connect({ model, config, callbacks });
 *   session.startMicrophone();   // begins capturing audio
 *   session.stopMicrophone();
 *   session.sendText("Hello");
 *   session.disconnect();
 */
export default class LiveSessionService {
  constructor() {
    this.ws = null;
    this.audioContext = null;
    this.mediaStream = null;
    this.audioWorkletNode = null;
    this.isRecording = false;
    this.callbacks = {};
    this.nextPlayTime = 0;
    this.scheduledSources = [];
    this.connected = false;
  }

  // ── Connection ─────────────────────────────────────────────

  /**
   * Connect to Prism's /ws/live and set up a Live API session.
   * @param {object} params
   * @param {string} params.model - e.g. "gemini-3.1-flash-live-preview"
   * @param {object} [params.config] - Live API config (responseModalities, systemInstruction, etc.)
   * @param {object} params.callbacks - { onSetupComplete, onAudio, onText, onThinking, onToolCall, onInputTranscription, onOutputTranscription, onTurnComplete, onInterrupted, onError, onClose }
   */
  connect({ model, config = {}, callbacks = {} }) {
    this.callbacks = callbacks;

    if (this.ws) {
      this.disconnect();
    }

    this.ws = new WebSocket(LIVE_WS_URL);

    this.ws.onopen = () => {
      // Send setup message to initialize the Live API session
      this.ws.send(JSON.stringify({
        type: "setup",
        model,
        config,
      }));
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this._handleMessage(data);
    };

    this.ws.onerror = (event) => {
      console.error("[LiveSession] WebSocket error:", event);
      if (this.callbacks.onError) {
        this.callbacks.onError("WebSocket connection error");
      }
    };

    this.ws.onclose = () => {
      this.connected = false;
      if (this.callbacks.onClose) {
        this.callbacks.onClose();
      }
    };
  }

  _handleMessage(data) {
    switch (data.type) {
      case "setupComplete":
        this.connected = true;
        if (this.callbacks.onSetupComplete) this.callbacks.onSetupComplete();
        break;

      case "audio":
        if (this.callbacks.onAudio) {
          this.callbacks.onAudio(data.data, data.mimeType);
        }
        // Auto-play audio if audio context exists
        this._playAudioChunk(data.data);
        break;

      case "text":
        if (this.callbacks.onText) this.callbacks.onText(data.text);
        break;

      case "thinking":
        if (this.callbacks.onThinking) this.callbacks.onThinking(data.content);
        break;

      case "toolCall":
        if (this.callbacks.onToolCall) this.callbacks.onToolCall(data.functionCalls);
        break;

      case "inputTranscription":
        if (this.callbacks.onInputTranscription) {
          this.callbacks.onInputTranscription(data.text);
        }
        break;

      case "outputTranscription":
        if (this.callbacks.onOutputTranscription) {
          this.callbacks.onOutputTranscription(data.text);
        }
        break;

      case "turnComplete":
        if (this.callbacks.onTurnComplete) this.callbacks.onTurnComplete(data);
        break;

      case "interrupted":
        this.stopAudioPlayback();
        if (this.callbacks.onInterrupted) this.callbacks.onInterrupted(data);
        break;

      case "usage":
        if (this.callbacks.onUsage) this.callbacks.onUsage(data.usage);
        break;

      case "error":
        if (this.callbacks.onError) this.callbacks.onError(data.message);
        break;

      case "sessionClosed":
        this.connected = false;
        if (this.callbacks.onClose) this.callbacks.onClose();
        break;
    }
  }

  disconnect() {
    this.stopMicrophone();
    this.stopAudioPlayback();
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "close" }));
      }
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  // ── Input ──────────────────────────────────────────────────

  sendText(text) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "text", text }));
    }
  }

  sendToolResponse(responses) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "toolResponse", responses }));
    }
  }

  // ── Microphone ─────────────────────────────────────────────

  async startMicrophone() {
    if (this.isRecording) return;

    try {
      // Initialize AudioContext and load worklet
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 48000,
        });
        await this.audioContext.audioWorklet.addModule("/pcm-processor.js");
      }

      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      // Get microphone stream
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 48000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.audioWorkletNode = new AudioWorkletNode(this.audioContext, "pcm-processor");

      this.audioWorkletNode.port.onmessage = (event) => {
        if (!this.isRecording) return;

        // Downsample from audioContext rate to 16kHz and convert to Int16 PCM
        const downsampled = this._downsampleBuffer(
          event.data,
          this.audioContext.sampleRate,
          16000,
        );
        const pcm16 = this._convertFloat32ToInt16(downsampled);

        // Send as base64 to Prism
        const base64 = this._arrayBufferToBase64(pcm16);
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            type: "audio",
            data: base64,
            mimeType: "audio/pcm;rate=16000",
          }));
        }
      };

      source.connect(this.audioWorkletNode);

      // Mute local feedback (prevent echo)
      const muteGain = this.audioContext.createGain();
      muteGain.gain.value = 0;
      this.audioWorkletNode.connect(muteGain);
      muteGain.connect(this.audioContext.destination);

      this.isRecording = true;
    } catch (err) {
      console.error("[LiveSession] Microphone error:", err);
      throw err;
    }
  }

  stopMicrophone() {
    this.isRecording = false;
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.audioWorkletNode) {
      this.audioWorkletNode.disconnect();
      this.audioWorkletNode = null;
    }
  }

  // ── Audio Playback ─────────────────────────────────────────

  async _initPlaybackContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      await this.audioContext.audioWorklet.addModule("/pcm-processor.js");
    }
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  _playAudioChunk(base64Data) {
    if (!this.audioContext) return;
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }

    try {
      // Decode base64 → ArrayBuffer → Int16 → Float32
      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const pcmData = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcmData.length);
      for (let i = 0; i < pcmData.length; i++) {
        float32[i] = pcmData[i] / 32768.0;
      }

      // Live API outputs at 24kHz
      const buffer = this.audioContext.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);

      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);

      const now = this.audioContext.currentTime;
      this.nextPlayTime = Math.max(now, this.nextPlayTime);
      source.start(this.nextPlayTime);
      this.nextPlayTime += buffer.duration;

      this.scheduledSources.push(source);
      source.onended = () => {
        const idx = this.scheduledSources.indexOf(source);
        if (idx > -1) this.scheduledSources.splice(idx, 1);
      };
    } catch (err) {
      console.error("[LiveSession] Audio playback error:", err);
    }
  }

  stopAudioPlayback() {
    this.scheduledSources.forEach((s) => {
      try { s.stop(); } catch { /* already stopped */ }
    });
    this.scheduledSources = [];
    if (this.audioContext) {
      this.nextPlayTime = this.audioContext.currentTime;
    }
  }

  // ── Audio Utils ────────────────────────────────────────────

  _downsampleBuffer(buffer, sampleRate, outSampleRate) {
    if (outSampleRate === sampleRate) return buffer;
    const ratio = sampleRate / outSampleRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = accum / count;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  }

  _convertFloat32ToInt16(buffer) {
    const buf = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      buf[i] = Math.min(1, Math.max(-1, buffer[i])) * 0x7fff;
    }
    return buf.buffer;
  }

  _arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}
