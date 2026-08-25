#!/usr/bin/env node
/**
 * Generates PWA raster icons from a simple pixel design (Task 6.3).
 * Dependency-free PNG encoding: raw RGBA scanlines -> zlib deflate -> PNG
 * chunks with CRC32. Run: node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'

const outDir = path.join(process.cwd(), 'frontend/public/icons')
mkdirSync(outDir, { recursive: true })

// ---- minimal PNG encoder ----------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0 // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  const idat = deflateSync(raw)
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

// ---- icon design: midnight slate, three spark-blue script lines, amber dot --

const BG = [15, 23, 42, 255] // #0F172A
const BLUE = [56, 189, 248, 255] // #38BDF8
const AMBER = [251, 191, 36, 255] // #FBBF24

function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4)
  const set = (x, y, [r, g, b, a]) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return
    const i = (y * size + x) * 4
    rgba[i] = r
    rgba[i + 1] = g
    rgba[i + 2] = b
    rgba[i + 3] = a
  }
  const rect = (x0, y0, x1, y1, color) => {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) set(x, y, color)
  }
  const roundRect = (x0, y0, x1, y1, radius, color) => {
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const dx = Math.max(x0 + radius - x, x - (x1 - 1 - radius), 0)
        const dy = Math.max(y0 + radius - y, y - (y1 - 1 - radius), 0)
        if (dx * dx + dy * dy <= radius * radius || (dx === 0 || dy === 0)) set(x, y, color)
      }
    }
  }

  rect(0, 0, size, size, BG)

  // Three script lines, generous safe-zone for maskable.
  const u = size / 512
  const lineH = Math.max(8, Math.round(26 * u))
  roundRect(Math.round(100 * u), Math.round(140 * u), Math.round(412 * u), Math.round(140 * u) + lineH, lineH / 2, BLUE)
  roundRect(Math.round(100 * u), Math.round(230 * u), Math.round(412 * u), Math.round(230 * u) + lineH, lineH / 2, BLUE)
  roundRect(Math.round(100 * u), Math.round(320 * u), Math.round(300 * u), Math.round(320 * u) + lineH, lineH / 2, BLUE)

  // Amber recording dot at the end of the short line.
  const dotR = Math.round(34 * u)
  const cx = Math.round(352 * u)
  const cy = Math.round(320 * u) + lineH / 2
  for (let y = cy - dotR; y <= cy + dotR; y++) {
    for (let x = cx - dotR; x <= cx + dotR; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= dotR * dotR) set(x, y, AMBER)
    }
  }

  return rgba
}

for (const size of [192, 512]) {
  const png = encodePng(size, size, drawIcon(size))
  writeFileSync(path.join(outDir, `icon-${size}.png`), png)
  console.log(`icon-${size}.png (${(png.length / 1024).toFixed(1)}KB)`)
}

const apple = encodePng(180, 180, drawIcon(180))
writeFileSync(path.join(outDir, 'apple-touch-icon.png'), apple)
console.log('apple-touch-icon.png')
