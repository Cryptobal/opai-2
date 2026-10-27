import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

import {
  exigirBaseDeStagingODev,
  exigirFueraDelRepositorio,
  exigirMismoDestinoStaging,
} from "../scripts/seed-staging";

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
    await expect(exigirFueraDelRepositorio(join(dir, "key.txt"))).rejects.toThrow("no existe");
  });
});

describe("seed:staging · host y base de destino", () => {
  it("valida las dos conexiones antes de escribir y permite credenciales diferentes", () => {
    const admin = "postgresql://admin:p@localhost/opai_staging";
    expect(() =>
      exigirMismoDestinoStaging(admin, "postgresql://app:p@localhost:5432/opai_staging"),
    ).not.toThrow();
    for (const app of [
      "postgresql://app:p@ep-main.aws.neon.tech/opai_staging",
      "postgresql://app:p@localhost/opai_dev",
      "postgresql://app:p@localhost:5433/opai_staging",
    ])
      expect(() => exigirMismoDestinoStaging(admin, app)).toThrow();
  });
  it("acepta solo bases locales dev/staging conocidas", () => {
    expect(() =>
      exigirBaseDeStagingODev("postgresql://u:p@127.0.0.1:5432/opai_staging"),
    ).not.toThrow();
    expect(() => exigirBaseDeStagingODev("postgresql://u:p@localhost:5432/opai_dev")).not.toThrow();
  });
  it("rechaza la rama main/producción aunque el nombre no la delate de otra forma", () => {
    expect(() =>
      exigirBaseDeStagingODev("postgresql://u:p@br-dawn-morning-b6037bp9.aws.neon.tech/neondb"),
    ).toThrow(/br-dawn-morning-b6037bp9/);
  });
  it("rechaza un host o una base que se vean como producción", () => {
    expect(() =>
      exigirBaseDeStagingODev("postgresql://u:p@ep-algo-prod.aws.neon.tech/neondb"),
    ).toThrow(/producción/);
    expect(() => exigirBaseDeStagingODev("postgresql://u:p@localhost:5432/opai_prod")).toThrow(
      /producción/,
    );
  });
  it("rechaza si ni el host ni la base dicen 'staging' o 'dev'", () => {
    expect(() => exigirBaseDeStagingODev("postgresql://u:p@localhost:5432/opai")).toThrow(
      /staging.*dev/,
    );
  });
  it("rechaza una URL de conexión inválida", () => {
    expect(() => exigirBaseDeStagingODev("no-es-una-url")).toThrow(/URL de conexión/);
  });
  it.each([
    "postgresql://u:p@ep-opaco.aws.neon.tech/opai_staging",
    "postgresql://u:p@dev-produccion.example/opai_dev",
    "postgresql://u:p@localhost/opai_dev?host=produccion.example",
    "postgresql://u:p@localhost/opai_dev?options=endpoint%3Dep-main",
    "https://localhost/opai_dev",
    "postgresql://u:p@localhost/development",
  ])("no acepta un destino disfrazado de dev/staging", (url) => {
    expect(() => exigirBaseDeStagingODev(url)).toThrow();
  });
});
