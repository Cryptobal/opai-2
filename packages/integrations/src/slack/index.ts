// Slack ↔ OPAI 2 (ADR-093, CAR-290 a CAR-296). Una sola app «OPAI»; el token del bot de cada empresa
// vive cifrado en el almacén del tenant (ADR-027). Sin SDK: HTTP directo (ADR-031).
export * from "./api";
export * from "./app";
export * from "./config";
export * from "./estado-oauth";
export * from "./firma";
export * from "./manifiesto/manifiesto";
