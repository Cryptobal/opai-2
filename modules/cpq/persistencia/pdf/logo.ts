// El logo de marca para PDF vive en @opai/capabilities (CAR-439): CPQ y Finanzas
// comparten una sola lectura. Aquí solo el tipo local y el alias que usan los PDF de CPQ.
export type LogoPdf = { bytes: Uint8Array; formato: "png" | "jpg" };
export { logoDeMarca as cargarLogoMarca } from "@opai/capabilities";
