import { extensionOf, formatDuration, isPlayableAudio, newAudioName } from './audio-files';

describe('extensionOf', () => {
  it('reads the extension of names and URIs', () => {
    expect(extensionOf('my dua.MP3')).toBe('mp3');
    expect(extensionOf('file:///data/cache/rec-1.m4a')).toBe('m4a');
    expect(extensionOf('content://x/y/audio.wav?id=3')).toBe('wav');
  });

  it('returns "" when there is no extension', () => {
    expect(extensionOf('content://media/external/audio/123')).toBe('');
    expect(extensionOf('.hidden')).toBe('');
  });
});

describe('isPlayableAudio', () => {
  it('accepts formats both platforms play', () => {
    for (const n of ['a.m4a', 'a.mp3', 'a.aac', 'a.wav', 'a.flac'])
      expect(isPlayableAudio(n)).toBe(true);
  });

  it('rejects non-audio and formats iOS cannot play', () => {
    expect(isPlayableAudio('a.pdf', 'application/pdf')).toBe(false);
    expect(isPlayableAudio('a.ogg', 'audio/ogg')).toBe(false);
  });

  it('trusts an audio type when the name has no extension', () => {
    expect(isPlayableAudio('recording', 'audio/mpeg')).toBe(true);
    expect(isPlayableAudio('recording', 'audio/ogg')).toBe(false);
    expect(isPlayableAudio('recording', null)).toBe(false);
  });
});

describe('newAudioName', () => {
  it('is unique per time/random and keeps a safe extension', () => {
    expect(newAudioName('mp3', 1000, 0.5)).toBe(
      `a-${(1000).toString(36)}-${Math.floor(0.5 * 36 ** 6).toString(36)}.mp3`,
    );
    expect(newAudioName('mp3', 1000, 0.5)).not.toBe(newAudioName('mp3', 1001, 0.5));
  });

  it('falls back to m4a for odd extensions', () => {
    expect(newAudioName('', 1, 0.1)).toMatch(/\.m4a$/);
    expect(newAudioName('../../x', 1, 0.1)).toMatch(/\.m4a$/);
  });
});

describe('formatDuration', () => {
  it('formats minutes and seconds', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65_400)).toBe('1:05');
    expect(formatDuration(-5)).toBe('0:00');
  });
});
