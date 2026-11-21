#!/usr/bin/env tsx
import { especsRelacionados } from "./preview-e2e-especs-relacionados";

const raw = process.argv[2];
const archivos: string[] = raw ? JSON.parse(raw) : [];
console.log([...especsRelacionados(archivos)].join(" "));