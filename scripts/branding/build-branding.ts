/**
 * Builds every logo image the app uses from the design SVGs in `wirduk-logo/`:
 * the in-app logo (light + dark), the app icon, the Android adaptive icon
 * (background, foreground, monochrome) and the splash images.
 *
 * Run after the logo changes:  npm run branding:build
 *
 * The SVGs have one element per line; this script relies on that:
 * - the background is `<circle cx="512" cy="512" r="512" …>`,
 * - the outer ring is the `r="478"` circle,
 * - the star at the bottom is two `<rect x="490.0" …>` squares, with two
 *   background-colored "cut-out" circles centered at (512, 884).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { Resvg } from '@resvg/resvg-js';

const ROOT = join(import.meta.dirname, '..', '..');
const SIZE = 1024;

/** Android adaptive icons: only the middle 72 of 108 dp is visible. Keep the logo inside it. */
const ADAPTIVE_SCALE = 0.8;

/**
 * Android 12+ splash: the icon is drawn at 288 dp and only a circle of 192 dp shows (two
 * thirds), so a logo that fills the image loses its edge (owner, 2026-10-29: "a little
 * cropped"). The whole round logo is shrunk to fit inside that circle, with a small margin.
 */
const SPLASH_SCALE = 0.64;

type Theme = 'light' | 'dark';

interface LogoParts {
  /** `<svg …>` opening tag, `<title>` and `<defs>`. */
  head: string;
  /** The `url(#bg)` fill, as defined in `<defs>`. */
  defs: string;
  /** Everything drawn on top of the background, except the outer ring. */
  content: string[];
  /** The whole logo as drawn: the round background, the ring and the content. */
  whole: string[];
}

function readLogo(theme: Theme): { svg: string; parts: LogoParts } {
  const svg = readFileSync(join(ROOT, 'wirduk-logo', `wirduk-${theme}.svg`), 'utf8');
  const lines = svg.split(/\r?\n/).filter((line) => line.trim() !== '');
  const defsStart = lines.findIndex((l) => l.startsWith('<defs>'));
  const defsEnd = lines.findIndex((l) => l.startsWith('</defs>'));
  const background = lines.findIndex((l) => /^<circle cx="512" cy="512" r="512"/.test(l));
  if (defsStart < 0 || defsEnd < defsStart || background !== defsEnd + 1) {
    throw new Error(`wirduk-${theme}.svg: unexpected layout (defs, then the background circle)`);
  }
  const whole = lines.slice(background, lines.lastIndexOf('</svg>'));
  const content = whole.slice(1).filter((l) => !/ r="478"/.test(l));
  return {
    svg,
    parts: {
      head: lines.slice(0, defsStart).join('\n'),
      defs: lines.slice(defsStart, defsEnd + 1).join('\n'),
      content,
      whole,
    },
  };
}

function svgDoc(parts: LogoParts, body: string[]): string {
  return [parts.head, parts.defs, ...body, '</svg>'].join('\n');
}

const fullBleed = `<rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>`;
const scaled = (lines: string[], scale: number) => [
  `<g transform="translate(512 512) scale(${scale}) translate(-512 -512)">`,
  ...lines,
  '</g>',
];

const isStar = (l: string) => l.startsWith('<rect x="490.0"');
const isCutOut = (l: string) => l.startsWith('<circle cx="512.0" cy="884.0"');

/** One color (white) with real holes where the design uses background-colored cut-outs. */
function monochrome(content: string[]): string[] {
  const white = (l: string) =>
    l
      .replace(/fill="(?!none)[^"]*"/g, 'fill="#FFFFFF"')
      .replace(/stroke="[^"]*"/g, 'stroke="#FFFFFF"')
      .replace(/ opacity="[^"]*"/g, '');
  const radius = (l: string) => Number(/ r="([\d.]+)"/.exec(l)?.[1]);
  const cutOuts = content
    .filter(isCutOut)
    .map(radius)
    .sort((a, b) => b - a);
  if (cutOuts.length !== 2) throw new Error('expected two cut-out circles under the star');
  const [around, inside] = cutOuts as [number, number];
  const hole = (id: string, r: number) =>
    `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${SIZE}" height="${SIZE}">` +
    `<rect width="${SIZE}" height="${SIZE}" fill="#FFFFFF"/>` +
    `<circle cx="512" cy="884" r="${r}" fill="#000000"/></mask>`;
  return [
    hole('around-star', around),
    hole('inside-star', inside),
    '<g mask="url(#around-star)">',
    ...content.filter((l) => !isStar(l) && !isCutOut(l)).map(white),
    '</g>',
    '<g mask="url(#inside-star)">',
    ...content.filter(isStar).map(white),
    '</g>',
  ];
}

function writePng(svg: string, file: string, width = SIZE): void {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();
  const path = join(ROOT, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, png);
  console.log(`${file}  ${width}px  ${Math.round(png.length / 1024)} KB`);
}

const light = readLogo('light');
const dark = readLogo('dark');

// In the app (Home header ~44 dp, About ~140 dp; 3x for sharp phones).
for (const [theme, logo] of [
  ['light', light],
  ['dark', dark],
] as const) {
  writePng(logo.svg, `assets/branding/logo-${theme}.png`, 480);
  writePng(logo.svg, `assets/branding/logo-${theme}-small.png`, 144);
}

// App icon (iOS and fallback): a full square, the system rounds the corners.
writePng(svgDoc(light.parts, [fullBleed, ...light.parts.content]), 'assets/icon.png');

// Android adaptive icon.
writePng(svgDoc(light.parts, [fullBleed]), 'assets/android-icon-background.png');
writePng(
  svgDoc(light.parts, scaled(light.parts.content, ADAPTIVE_SCALE)),
  'assets/android-icon-foreground.png',
);
writePng(
  svgDoc(light.parts, scaled(monochrome(light.parts.content), ADAPTIVE_SCALE)),
  'assets/android-icon-monochrome.png',
);

// Android notification icon (status bar): white on transparent, 96 px (expo-notifications plugin).
writePng(svgDoc(light.parts, monochrome(light.parts.content)), 'assets/notification-icon.png', 96);

// Splash: the whole round logo, shrunk inside Android 12+'s visible circle, on transparent
// (the app background color behind it is set in app.config.ts).
writePng(svgDoc(light.parts, scaled(light.parts.whole, SPLASH_SCALE)), 'assets/splash-icon.png');
writePng(svgDoc(dark.parts, scaled(dark.parts.whole, SPLASH_SCALE)), 'assets/splash-icon-dark.png');
