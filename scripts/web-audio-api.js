import { AudioContext } from 'web-audio-api';

export class WebAudioAPI {
  constructor() {
    this.audioContext = new AudioContext();
    this.microphoneStream = null;
  }

  async getMicrophoneStream() {
    this.microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  }

  async createMediaStreamDestination() {
    const destination = this.audioContext.createMediaStreamDestination();
    return destination;
  }

  async startRecording() {
    const source = this.audioContext.createMediaStreamSource(this.microphoneStream);
    const destination = this.createMediaStreamDestination();

    source.connect(destination);
    destination.stream.getAudioTracks()[0].addEventListener('data', event => {
      console.log('Recording audio data:', event.data);
    });
  }

  async stopRecording() {
    this.microphoneStream.getAudioTracks()[0].addEventListener('ended', () => {
      console.log('Recording stopped');
    });
  }

  getAudioBuffer() {
    const audioBuffer = new Promise((resolve) => {
      const chunks = [];
      this.microphoneStream.getAudioTracks()[0].addEventListener('data', event => {
        chunks.push(event.data);
      });
      this.microphoneStream.getAudioTracks()[0].addEventListener('ended', () => resolve(chunks.reduce((accumulator, chunk) => {
        const buffer = new Uint8Array(accumulator.byteLength + chunk.byteLength);
        accumulator.set(new Uint8Array(buffer, 0, accumulator.byteLength));
        chunk.set(new Uint8Array(buffer, accumulator.byteLength));
        return buffer;
      }, new Uint8Array(0))));
    });
    return new Blob([audioBuffer], { type: 'audio/wav' });
  }
}