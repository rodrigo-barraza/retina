/**
 * AudioWorklet processor that captures raw PCM audio samples.
 * Runs in the audio rendering thread — sends Float32Array chunks
 * to the main thread via port.postMessage().
 *
 * Input: raw audio from getUserMedia microphone
 * Output: Float32Array chunks at the AudioContext's sample rate
 */
class PCMProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input[0] && input[0].length > 0) {
      // Clone the buffer (it will be reused by the audio thread)
      this.port.postMessage(new Float32Array(input[0]));
    }
    return true;
  }
}

registerProcessor("pcm-processor", PCMProcessor);
