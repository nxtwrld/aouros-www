// Generates native splash screens from static/icon.svg on the icon's teal gradient.
// Run from repo root: node mobile/resources/generate-splash.mjs
import { readFileSync } from "node:fs";
import sharp from "sharp";

const GRADIENT_TOP = "#9bf8fd";
const GRADIENT_BOTTOM = "#03b8c1";

// Inner markup of the 500x500 logo (paths + circle), without the XML/style wrapper
const logo = readFileSync("static/icon.svg", "utf8")
  .match(/<g id="Layer_6">([\s\S]*?)<\/g>/)[1]
  .replace(/class="red-line"/g, 'fill="#FF0086"')
  .replace(/class="(white-line|dot)"/g, 'fill="#FFFFFF"');

// logo = logo edge as a fraction of the shorter side.
// iOS uses one 2732 square that is aspect-filled (cropped) on phones, so its logo is smaller.
const IOS = "ios/App/App/Assets.xcassets/Splash.imageset";
const ANDROID = "android/app/src/main/res";
const targets = [
  ...["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"].map((f) => ({
    file: `${IOS}/${f}`, w: 2732, h: 2732, logo: 0.22,
  })),
  { file: `${ANDROID}/drawable/splash.png`, w: 480, h: 320 },
  { file: `${ANDROID}/drawable-land-mdpi/splash.png`, w: 480, h: 320 },
  { file: `${ANDROID}/drawable-land-hdpi/splash.png`, w: 800, h: 480 },
  { file: `${ANDROID}/drawable-land-xhdpi/splash.png`, w: 1280, h: 720 },
  { file: `${ANDROID}/drawable-land-xxhdpi/splash.png`, w: 1600, h: 960 },
  { file: `${ANDROID}/drawable-land-xxxhdpi/splash.png`, w: 1920, h: 1280 },
  { file: `${ANDROID}/drawable-port-mdpi/splash.png`, w: 320, h: 480 },
  { file: `${ANDROID}/drawable-port-hdpi/splash.png`, w: 480, h: 800 },
  { file: `${ANDROID}/drawable-port-xhdpi/splash.png`, w: 720, h: 1280 },
  { file: `${ANDROID}/drawable-port-xxhdpi/splash.png`, w: 960, h: 1600 },
  { file: `${ANDROID}/drawable-port-xxxhdpi/splash.png`, w: 1280, h: 1920 },
];

function splashSvg(w, h, fraction) {
  const size = Math.min(w, h) * fraction;
  const scale = size / 500;
  const x = (w - size) / 2;
  const y = (h - size) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${GRADIENT_TOP}"/>
      <stop offset="1" stop-color="${GRADIENT_BOTTOM}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <g transform="translate(${x} ${y}) scale(${scale})">${logo}</g>
</svg>`;
}

for (const { file, w, h, logo: fraction = 0.45 } of targets) {
  await sharp(Buffer.from(splashSvg(w, h, fraction))).png().toFile(file);
  console.log(`${file} (${w}x${h})`);
}
