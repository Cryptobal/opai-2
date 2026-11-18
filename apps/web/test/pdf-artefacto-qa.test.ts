import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { guardarPdfFixtureQa } from "../e2e/pdf-artefacto-qa";

it("conserva los bytes sintéticos sin consultas y rechaza contenido no PDF", async () => {
  const carpeta = await mkdtemp(join(tmpdir(), "pdf-qa-"));
  try {
    const bytes = Buffer.from("%PDF-1.7\nfixture sintético");
    const ruta = await guardarPdfFixtureQa(bytes, carpeta, "cpq-base-ficticia");
    expect(await readFile(ruta)).toEqual(bytes);
    await expect(guardarPdfFixtureQa(Buffer.from("no PDF"), carpeta, "cpq-secciones-ficticias")).rejects.toThrow("no contiene un PDF");
  } finally {
    await rm(carpeta, { recursive: true, force: true });
  }
});
