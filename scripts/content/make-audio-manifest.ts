/**
 * Builds content-source/audio-manifest.json from a folder of mp3 files (the
 * book's recordings) and m4a files (the owner's, milestone 11). Run once when
 * the audio files change:
 *
 *   node scripts/content/make-audio-manifest.ts <audio-folder> [lang]
 *
 * The manifest gives the app every file's size (for "download all") and lets
 * us verify the hosted copy in the wirduk-audio repo. An mp3 is listed without
 * its extension; an m4a with it (`1001.m4a`), as the app names them.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [audioDir, lang = 'ar'] = process.argv.slice(2);
if (!audioDir) {
  console.error('Usage: node scripts/content/make-audio-manifest.ts <audio-folder> [lang]');
  process.exit(1);
}

/** MP3 files start with an ID3 tag or an MPEG frame sync (0xFFEx/0xFFFx). */
function looksLikeMp3(bytes: Buffer): boolean {
  if (bytes.length < 3) return false;
  const id3 = bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33;
  const frameSync = bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0;
  return id3 || frameSync;
}

/** MP4 audio (m4a) starts with a box of type `ftyp`. */
function looksLikeMp4(bytes: Buffer): boolean {
  return bytes.length >= 8 && bytes.toString('latin1', 4, 8) === 'ftyp';
}

const names = readdirSync(audioDir).sort();
const sha256 = (data: Buffer) => createHash('sha256').update(data).digest('hex');

const files = names.flatMap((name) => {
  const path = join(audioDir, name);
  if (!statSync(path).isFile()) return [];
  const data = readFileSync(path);
  if (name.toLowerCase().endsWith('.m4a')) {
    if (!looksLikeMp4(data)) throw new Error(`"${name}" is not an m4a (MP4) file`);
    return [{ file: name, bytes: data.length, sha256: sha256(data) }];
  }
  const hasExt = name.toLowerCase().endsWith('.mp3');
  // The source has one mp3 saved without its extension, next to an
  // identical copy with the extension. Skip such a copy; anything else
  // must be renamed to <name>.mp3 when it is published.
  if (!hasExt) {
    if (name.includes('.') || !looksLikeMp3(data)) return [];
    if (names.includes(`${name}.mp3`)) {
      if (sha256(readFileSync(join(audioDir, `${name}.mp3`))) !== sha256(data)) {
        throw new Error(`"${name}" and "${name}.mp3" differ: decide which one to publish`);
      }
      console.warn(`Note: skipped "${name}", an exact copy of "${name}.mp3".`);
      return [];
    }
    console.warn(`Note: "${name}" has no .mp3 extension. Publish it as "${name}.mp3".`);
  }
  return [
    {
      file: name.replace(/\.mp3$/i, ''),
      bytes: data.length,
      sha256: sha256(data),
    },
  ];
});

const out = join(import.meta.dirname, '..', '..', 'content-source', 'audio-manifest.json');
writeFileSync(out, JSON.stringify({ lang, files }, null, 2) + '\n');
console.log(`Wrote ${files.length} entries to ${out}`);
