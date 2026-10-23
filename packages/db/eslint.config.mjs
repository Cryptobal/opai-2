import { baseConfig } from "../../eslint.base.mjs";

// Único lugar donde se permite importar el cliente Prisma crudo.
export default [
  ...baseConfig,
  { ignores: ["src/generated/**"] },
  { rules: { "no-restricted-imports": "off" } },
];
