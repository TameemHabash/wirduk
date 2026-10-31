# Sounds

| File | Used for | Source | License |
|---|---|---|---|
| `tick.wav` | The short tick on each count (setting "صوت خفيف عند كل عدّة", off by default) | `click_005.ogg` from **Interface Sounds 1.0** by Kenney (kenney.nl), chosen by the owner on 2026-10-17. Converted to 16-bit mono WAV, silence trimmed. 2026-10-22 (owner: "too quiet"): soft-shaped (tanh, drive 2.5) and set to −0.3 dBFS peak; RMS −7.8 dBFS (was −19.2). | CC0 1.0 — see `LICENSE-kenney-interface-sounds.txt` (credit not required) |

The level is set in the file, not in code: the app plays it at full volume (the phone's media
volume still applies).

To change the level: `node scripts/dev/wav-level.ts <in.wav> <out.wav> <peak> [drive]`
(peak 0–1; drive > 1 makes it sound louder at the same peak). Without the last arguments it only
prints the level. If a new sound comes from a pack, add its license file here and a row above.
