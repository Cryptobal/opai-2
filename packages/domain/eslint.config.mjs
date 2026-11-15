import { baseConfig, domainConfig } from "../../eslint.base.mjs";

export default [
  // Generado por `gen:novedades-embed`: crece con cada novedad, no se edita a mano (igual que `src/generated` de db).
  { ignores: ["src/novedades/entradas/embed.ts"] },
  ...baseConfig,
  { ...domainConfig, files: ["src/**/*.ts"] },
];
