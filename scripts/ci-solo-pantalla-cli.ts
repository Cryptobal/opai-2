#!/usr/bin/env tsx
import { diffSoloPantalla } from "./ci-solo-pantalla";

const raw = process.argv[2];
if (!raw) {
  console.log("false");
  process.exit(0);
}
const archivos: string[] = JSON.parse(raw);
console.log(diffSoloPantalla(archivos) ? "true" : "false");