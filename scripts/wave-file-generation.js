function generateWavFile(audioBuffer) {
  const audioData = new Uint8Array(audioBuffer);
  const header = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, // "RIFF" (file signature)
    0x57, 0x41, 0x56, 0x45, // "WAVE" (file type)
    0x00, 0x00, 0x00, 0x00, // chunk size (not used)
    0x00, 0x01, 0x00, 0x00, // format chunk (ID and size)
    0x00, 0x00, 0x01, 0x00, // subchunk1 size (not used)
    0x01, 0x00, 0x01, 0x00, // audio format (1 for PCM)
    0x02, 0x00, 0x00, 0x10, // num channels (2 for stereo)
    0x44, 0x61, 0x30, 0x3B, // block align (16 for 16-bit signed)
    0x00, 0x00, 0x00, 0x10, // bits per sample (16 for 16-bit signed)
    0x00, 0x00, 0x10, 0x00, // sample rate (44.1 kHz, 16-bit)
    0x44, 0x61, 0x30, 0x3B, // block align (16 for 16-bit signed)
    0x00, 0x00, 0x00, 0x10, // bits per sample (16 for 16-bit signed)
    0x00, 0x00, 0x10, 0x00, // sample rate (44.1 kHz, 16-bit)
  ]);

  const buffer = new Uint8Array(audioBuffer.byteLength + header.byteLength);
  buffer.set(new Uint8Array(header));
  audioData.set(new Uint8Array(audioData));
  return new Blob([buffer], { type: 'audio/wav' });
}