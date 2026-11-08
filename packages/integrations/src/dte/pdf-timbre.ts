// Timbre electrónico PDF417 como imagen PNG (CAR-221). Nivel de corrección 5, como pide el SII.
import bwipjs from "bwip-js/node";

export async function timbrePng(texto: string): Promise<Uint8Array> {
  // Variable aparte: los tipos de bwip-js no declaran `eclevel`, aunque la librería lo lee.
  const opciones = { bcid: "pdf417", text: texto, eclevel: 5, columns: 12, scale: 3, rowheight: 4 };
  const png = await bwipjs.toBuffer(opciones);
  return new Uint8Array(png);
}
