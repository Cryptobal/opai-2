// Íconos PWA provisionales del Brief 04 (D4): monograma "O" blanco sobre el índigo de OPAI
// (--ds-accent #4a3fd8 de packages/ds/src/tokens.css). Sin dependencias nuevas: el PNG se arma a
// mano con zlib de Node. Son provisionales hasta el logo definitivo (ESTADO.md); el reemplazo es
// solo de activos, sin código. Uso: pnpm iconos:pwa
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

const INDIGO: readonly [number, number, number] = [0x4a, 0x3f, 0xd8];
const BLANCO: readonly [number, number, number] = [0xff, 0xff, 0xff];
const DESTINO = join(import.meta.dirname, "..", "apps", "web", "public");

const TABLA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = (TABLA_CRC[(c ^ b) & 0xff] ?? 0) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(tipo: string, datos: Buffer): Buffer {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length, 0);
  const cuerpo = Buffer.concat([Buffer.from(tipo, "latin1"), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(cuerpo), 0);
  return Buffer.concat([largo, cuerpo, crc]);
}

/** PNG RGBA (8 bits, sin entrelazar) a partir de los píxeles crudos. */
function png(size: number, rgba: Buffer): Buffer {
  const firma = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const ancho = size * 4 + 1;
  const filas = Buffer.alloc(size * ancho);
  for (let y = 0; y < size; y++) rgba.copy(filas, y * ancho + 1, y * size * 4, (y + 1) * size * 4);
  const idat = deflateSync(filas, { level: 9 });
  return Buffer.concat([firma, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

/** Dibuja el ícono: fondo índigo (cuadrado completo si `full`, con esquinas redondas si no) y el
 *  anillo blanco de la "O" centrado. `roF` es el radio externo del anillo como fracción del lado. */
function dibujar(size: number, full: boolean, roF: number): Buffer {
  const rgba = Buffer.alloc(size * size * 4);
  const b = size / 2;
  const rr = size * 0.22;
  const ro = size * roF;
  const ri = ro - size * 0.12;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5 - b;
      const py = y + 0.5 - b;
      let fondo = true;
      if (!full) {
        const qx = Math.abs(px) - (b - rr);
        const qy = Math.abs(py) - (b - rr);
        const sd = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rr;
        fondo = sd <= 0;
      }
      const d = Math.hypot(px, py);
      const color = d >= ri && d <= ro ? BLANCO : INDIGO;
      const i = (y * size + x) * 4;
      if (fondo) {
        rgba[i] = color[0];
        rgba[i + 1] = color[1];
        rgba[i + 2] = color[2];
        rgba[i + 3] = 255;
      }
    }
  }
  return rgba;
}

const SALIDAS: ReadonlyArray<[string, number, boolean, number]> = [
  ["icono-192.png", 192, false, 0.34],
  ["icono-512.png", 512, false, 0.34],
  ["icono-maskable-192.png", 192, true, 0.3],
  ["icono-maskable-512.png", 512, true, 0.3],
  ["apple-touch-icon.png", 180, true, 0.34],
];

for (const [nombre, size, full, roF] of SALIDAS) {
  writeFileSync(join(DESTINO, nombre), png(size, dibujar(size, full, roF)));
  console.log(nombre);
}
