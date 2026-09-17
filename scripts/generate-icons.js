// Generate simple solid PNG icons with sparkling AI theme
import fs from 'fs';
import path from 'path';

// Valid 1x1 base PNG and minimal PNG generator without external deps
function createPngBuffer(size) {
  // A minimal valid 24-bit RGB PNG
  // We can write a tiny valid PNG file using pure Node.js Buffer and zlib
  import('zlib').then(({ deflateSync }) => {
    const width = size;
    const height = size;

    // Signature
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    // IHDR chunk
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr.writeUInt8(8, 8); // 8-bit
    ihdr.writeUInt8(6, 9); // RGBA
    ihdr.writeUInt8(0, 10);
    ihdr.writeUInt8(0, 11);
    ihdr.writeUInt8(0, 12);
    const ihdrChunk = makeChunk('IHDR', ihdr);

    // Image data (raw RGBA with filter byte 0 at start of each scanline)
    const scanlineLength = width * 4 + 1;
    const rawData = Buffer.alloc(height * scanlineLength);

    for (let y = 0; y < height; y++) {
      const lineStart = y * scanlineLength;
      rawData[lineStart] = 0; // Filter 0 (None)
      for (let x = 0; x < width; x++) {
        const pixelStart = lineStart + 1 + x * 4;
        // Nice blue/indigo gradient with rounded corner
        const dx = (x - width / 2) / (width / 2);
        const dy = (y - height / 2) / (height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.95) {
          // Blue to indigo gradient (#2563eb to #4f46e5)
          rawData[pixelStart] = 37 + Math.floor(40 * (x / width));     // R
          rawData[pixelStart + 1] = 99 + Math.floor(30 * (y / height)); // G
          rawData[pixelStart + 2] = 235;                               // B
          rawData[pixelStart + 3] = 255;                               // A
        } else {
          rawData[pixelStart] = 0;
          rawData[pixelStart + 1] = 0;
          rawData[pixelStart + 2] = 0;
          rawData[pixelStart + 3] = 0;
        }
      }
    }

    const compressed = deflateSync(rawData);
    const idatChunk = makeChunk('IDAT', compressed);
    const iendChunk = makeChunk('IEND', Buffer.alloc(0));

    const png = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);

    const iconsDir = path.resolve(process.cwd(), 'public/icons');
    if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), png);
    console.log(`Generated public/icons/icon-${size}.png`);
  });
}

function makeChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(4 + 4 + length + 4);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4);
  data.copy(chunk, 8);

  const crc = crc32(chunk.subarray(4, 8 + length));
  chunk.writeUInt32BE(crc, 8 + length);
  return chunk;
}

// CRC32 implementation
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

[16, 32, 48, 128].forEach(createPngBuffer);
