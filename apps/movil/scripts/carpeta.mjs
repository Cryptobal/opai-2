// Imprime la carpeta nativa de la variante elegida con OPAI_APP (la usa `pnpm apk`).
const carpetas = { opai: "nativo/opai", terreno: "nativo/terreno" };
const variante = process.env.OPAI_APP ?? "opai";
if (!(variante in carpetas)) throw new Error(`OPAI_APP desconocida: ${variante}`);
console.log(carpetas[variante]);
