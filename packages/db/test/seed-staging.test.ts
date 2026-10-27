import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

import { exigirFueraDelRepositorio } from "../scripts/seed-staging";

const raizRepo = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("seed:staging · ruta del secreto fuera del repositorio", () => {
  const creados: string[] = [];
  afterEach(async () => {
    while (creados.length > 0) await rm(creados.pop()!, { recursive: true, force: true });
  });

  it("acepta un directorio fuera del repositorio", async () => {
    const dir = await mkdtemp(join(tmpdir(), "opai-seed-staging-"));
    creados.push(dir);
    await expect(exigirFueraDelRepositorio(join(dir, "key.txt"))).resolves.toBeUndefined();
  });

  it("rechaza un directorio dentro del repositorio", async () => {
    const dir = join(raizRepo, "packages", "db", ".tmp-seed-staging-dentro");
    await mkdir(dir, { recursive: true });
    creados.push(dir);
    await expect(exigirFueraDelRepositorio(join(dir, "key.txt"))).rejects.toThrow(
      "fuera del repositorio",
    );
  });

  it("rechaza un directorio interno aunque su nombre empiece con '..' (no es un string.startsWith)", async () => {
    // Bug real: `.startsWith("..")` sobre el string de la ruta relativa confunde un directorio
    // llamado literalmente "..secret" (dentro del repo) con una ruta que sube fuera de él.
    const dir = join(raizRepo, "packages", "db", "..tmp-seed-staging-secret");
    await mkdir(dir, { recursive: true });
    creados.push(dir);
    await expect(exigirFueraDelRepositorio(join(dir, "key.txt"))).rejects.toThrow(
      "fuera del repositorio",
    );
  });

  it("rechaza si el directorio no existe, sin confundirlo con 'fuera del repositorio'", async () => {
    const dir = join(tmpdir(), "opai-seed-staging-inexistente-xyz");
    await expect(exigirFueraDelRepositorio(join(dir, "key.txt"))).rejects.toThrow(
      "no existe",
    );
  });
});
