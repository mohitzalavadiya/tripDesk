const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const APP_DIR = path.join(PROJECT_ROOT, 'src', 'app');
const TEMP_DIR = path.join(process.env.LOCALAPPDATA || 'C:\\Users\\hp\\AppData\\Local', 'Temp');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// 1. Authoritative Brand Mark SVG (512x512)
// Visual Match: bg-indigo-600 (#4f46e5) container with rounded-lg radius, and white PlaneTakeoff icon centered
const LOGO_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" fill="none">
  <!-- Brand Mark Background (#4f46e5 / bg-indigo-600) with rounded corners matching rounded-lg -->
  <rect width="512" height="512" rx="112" fill="#4f46e5"/>
  <!-- PlaneTakeoff Lucide icon paths centered with exact proportions and stroke weight -->
  <g transform="translate(112, 112) scale(12)" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M2 22h20"/>
    <path d="M6.36 17.4 4 17l-2-4 1.1-.55a2 2 0 0 1 1.8 0l.17.1a2 2 0 0 0 1.8 0L8 12 5 6l.9-.45a2 2 0 0 1 2.09.2l4.02 3a2 2 0 0 0 2.1.2l4.19-2.06a2.41 2.41 0 0 1 1.73-.17L21 7a1.4 1.4 0 0 1 .87 1.99l-.38.76c-.23.46-.6.84-1.07 1.08L7.58 17.2a2 2 0 0 1-1.22.18Z"/>
  </g>
</svg>
`;

// 2. Authoritative Full Horizontal Logo SVG (640x160)
// Visual Match: Brand Mark + Inter 900 "Your Travel Desk"
const LOGO_FULL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 160" width="640" height="160" fill="none">
  <!-- Brand Mark Container -->
  <rect x="20" y="20" width="120" height="120" rx="26" fill="#4f46e5"/>
  <g transform="translate(46.4, 46.4) scale(2.8)" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M2 22h20"/>
    <path d="M6.36 17.4 4 17l-2-4 1.1-.55a2 2 0 0 1 1.8 0l.17.1a2 2 0 0 0 1.8 0L8 12 5 6l.9-.45a2 2 0 0 1 2.09.2l4.02 3a2 2 0 0 0 2.1.2l4.19-2.06a2.41 2.41 0 0 1 1.73-.17L21 7a1.4 1.4 0 0 1 .87 1.99l-.38.76c-.23.46-.6.84-1.07 1.08L7.58 17.2a2 2 0 0 1-1.22.18Z"/>
  </g>
  <!-- Brand Typography -->
  <text x="165" y="99" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="52" font-weight="900" letter-spacing="-1.5">
    <tspan fill="#0f172a">Your Travel </tspan><tspan fill="#4f46e5">Desk</tspan>
  </text>
</svg>
`;

function renderSvgHtml(svgContent, width, height) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@800;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${width}px;
    height: ${height}px;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  svg {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
</head>
<body>
${svgContent}
</body>
</html>`;
}

function renderPng(svgContent, width, height) {
  const htmlContent = renderSvgHtml(svgContent, width, height);
  const tempHtml = path.join(TEMP_DIR, `brand_render_${width}x${height}_${Date.now()}.html`);
  const tempPng = path.join(TEMP_DIR, `brand_render_${width}x${height}_${Date.now()}.png`);
  fs.writeFileSync(tempHtml, htmlContent, 'utf8');

  const cmd = `"${CHROME_PATH}" --headless=new --no-sandbox --disable-gpu --screenshot="${tempPng}" --window-size=${width},${height} --default-background-color=00000000 "file:///${tempHtml.replace(/\\/g, '/')}"`;
  execSync(cmd, { stdio: 'pipe' });

  if (!fs.existsSync(tempPng)) {
    throw new Error(`Failed to generate PNG for ${width}x${height}`);
  }

  const buffer = fs.readFileSync(tempPng);
  fs.unlinkSync(tempHtml);
  fs.unlinkSync(tempPng);
  return buffer;
}

function buildIco(pngItems) {
  const count = pngItems.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let offset = headerSize + dirEntrySize * count;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(count, 4);

  const entries = [];
  const datas = [];

  for (const item of pngItems) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(item.width >= 256 ? 0 : item.width, 0);
    entry.writeUInt8(item.height >= 256 ? 0 : item.height, 1);
    entry.writeUInt8(0, 2); // colors
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(item.buffer.length, 8); // size
    entry.writeUInt32LE(offset, 12); // offset

    entries.push(entry);
    datas.push(item.buffer);
    offset += item.buffer.length;
  }

  return Buffer.concat([header, ...entries, ...datas]);
}

async function main() {
  console.log('--- Generating Your Travel Desk Brand Assets ---');

  // 1. Vector Sources in public/
  const logoMarkSvgPath = path.join(PUBLIC_DIR, 'logo-mark.svg');
  const logoFullSvgPath = path.join(PUBLIC_DIR, 'logo.svg');
  fs.writeFileSync(logoMarkSvgPath, LOGO_MARK_SVG, 'utf8');
  fs.writeFileSync(logoFullSvgPath, LOGO_FULL_SVG, 'utf8');
  console.log('✓ Created public/logo-mark.svg (512x512 vector brand mark)');
  console.log('✓ Created public/logo.svg (640x160 vector full logo)');

  // 2. Raster Copies in public/
  console.log('Rendering public/logo-mark.png (512x512)...');
  const logoMarkPngBuf = renderPng(LOGO_MARK_SVG, 512, 512);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'logo-mark.png'), logoMarkPngBuf);
  console.log('✓ Created public/logo-mark.png (512x512 PNG, size: ' + logoMarkPngBuf.length + ' bytes)');

  console.log('Rendering public/logo.png (640x160)...');
  const logoFullPngBuf = renderPng(LOGO_FULL_SVG, 640, 160);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'logo.png'), logoFullPngBuf);
  console.log('✓ Created public/logo.png (640x160 PNG, size: ' + logoFullPngBuf.length + ' bytes)');

  // 3. Next.js App Router Favicon & App Icons in src/app/
  // src/app/icon.svg: Scalable vector icon for modern browsers
  const appIconSvgPath = path.join(APP_DIR, 'icon.svg');
  fs.writeFileSync(appIconSvgPath, LOGO_MARK_SVG, 'utf8');
  console.log('✓ Created src/app/icon.svg (App Router vector icon)');

  // src/app/icon.png: 512x512 high-resolution icon for devices and browsers
  const appIconPngPath = path.join(APP_DIR, 'icon.png');
  fs.writeFileSync(appIconPngPath, logoMarkPngBuf);
  console.log('✓ Created src/app/icon.png (App Router raster icon 512x512)');

  // src/app/apple-icon.png: 180x180 Apple touch icon
  console.log('Rendering src/app/apple-icon.png (180x180)...');
  const appleIconBuf = renderPng(LOGO_MARK_SVG, 180, 180);
  fs.writeFileSync(path.join(APP_DIR, 'apple-icon.png'), appleIconBuf);
  console.log('✓ Created src/app/apple-icon.png (180x180 PNG, size: ' + appleIconBuf.length + ' bytes)');

  // src/app/favicon.ico: Multi-resolution ICO (16x16, 32x32, 48x48)
  console.log('Rendering favicon frames (16x16, 32x32, 48x48)...');
  const ico16 = renderPng(LOGO_MARK_SVG, 16, 16);
  const ico32 = renderPng(LOGO_MARK_SVG, 32, 32);
  const ico48 = renderPng(LOGO_MARK_SVG, 48, 48);

  const icoBuffer = buildIco([
    { width: 16, height: 16, buffer: ico16 },
    { width: 32, height: 32, buffer: ico32 },
    { width: 48, height: 48, buffer: ico48 },
  ]);

  const faviconPath = path.join(APP_DIR, 'favicon.ico');
  fs.writeFileSync(faviconPath, icoBuffer);
  console.log('✓ Replaced src/app/favicon.ico (Multi-size ICO 16/32/48, size: ' + icoBuffer.length + ' bytes)');

  console.log('--- All brand assets successfully generated! ---');
}

main().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
