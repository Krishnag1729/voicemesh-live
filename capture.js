// AudioWorklet: downsample whatever reaches it to 16 kHz int16 and post 160 ms frames.
// No input (sample finished, mic off) or mute (Hindi playing, no headphones) sends silence,
// so the stream stays continuous and the last clause still gets committed.
class Capture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.step = sampleRate / 16000;
    this.pos = 0;            // fractional read position into the current block
    this.acc = 0; this.n = 0; // box-filter accumulator for the next output sample
    this.out = new Int16Array(2560);
    this.k = 0;
    this.mute = false;
    this.port.onmessage = (e) => { this.mute = !!e.data.mute; };
  }
  push(v) {
    this.out[this.k++] = Math.max(-32768, Math.min(32767, Math.round(v * 32767)));
    if (this.k === this.out.length) {
      this.port.postMessage(this.out.buffer, [this.out.buffer]);
      this.out = new Int16Array(2560);
      this.k = 0;
    }
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    const len = ch ? ch.length : 128;
    for (let i = 0; i < len; i++) {
      this.acc += ch && !this.mute ? ch[i] : 0;
      this.n++;
      this.pos += 1;
      if (this.pos >= this.step) {
        this.pos -= this.step;
        this.push(this.acc / this.n);
        this.acc = 0; this.n = 0;
      }
    }
    return true;
  }
}
registerProcessor("capture", Capture);
