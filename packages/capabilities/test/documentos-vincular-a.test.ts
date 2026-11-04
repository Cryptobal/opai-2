import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";

import { CAPA_DE_ENTIDAD } from "../../../apps/web/app/_components/documentos/tipos";
import { CAPA_DE } from "../src/core/documentos/entidad";
import { contextoDePrueba } from "../src/testing";
import { codigo, dato, reiniciar } from "./maestros-ayuda";

// CAR-182: el explorador de Documentos vincula a empresa, cuenta, instalación o persona. La UI solo
// ofrece candidatos; aquí se fija que el servidor (`verificarEntidad` y `tipoParaEntidad`) decide.
beforeEach(reiniciar);

const SHA = "1".repeat(64);
const subida = (entidad: unknown, tipoId?: string) => ({
  entidad,
  ...(tipoId ? { tipoId } : {}),
  nombre: "doc.pdf",
  mime: "application/pdf",
  tamano: 10,
  sha256: SHA,
});

async function escenario() {
  const p = contextoDePrueba();
  const { ctx } = p;
  const cuenta = await dato<{ id: string }>(ctx, "core.cuentas.create", { nombre: "Andina" });
  const inst = await dato<{ id: string }>(ctx, "core.instalaciones.create", {
    cuentaId: cuenta.id,
    nombre: "Planta Norte",
  });
  const persona = await dato<{ id: string }>(ctx, "core.personas.create", {
    nombres: "Ana",
    apellidos: "Rojas",
    rut: "19.876.543-0",
  });
  const entidades = {
    tenant: { tipo: "tenant", id: ctx.tenantId },
    cuenta: { tipo: "cuenta", id: cuenta.id },
    instalacion: { tipo: "instalacion", id: inst.id },
    persona: { tipo: "persona", id: persona.id },
  } as const;
  const tipos: Record<string, string> = {};
  for (const capa of ["empresa", "cuenta", "instalacion", "persona"]) {
    const t = await dato<{ id: string }>(ctx, "core.documento_tipos.create", {
      codigo: `t_${capa}`,
      capa,
      nombre: `Tipo ${capa}`,
      tieneVencimiento: false,
    });
    tipos[capa] = t.id;
  }
  return { ...p, entidades, tipos };
}

describe("subir desde el explorador: «Vincular a»", () => {
  it("la tabla de capas de la UI es la del servidor", () => {
    for (const [tipo, capa] of Object.entries(CAPA_DE_ENTIDAD)) {
      expect(CAPA_DE[tipo as keyof typeof CAPA_DE], tipo).toBe(capa);
    }
  });

  it("cada entidad acepta los tipos de su capa (la tabla de la UI coincide con el servidor)", async () => {
    const { ctx, entidades, tipos } = await escenario();
    for (const [clave, entidad] of Object.entries(entidades)) {
      const capa = CAPA_DE_ENTIDAD[clave as keyof typeof CAPA_DE_ENTIDAD];
      const r = await codigo(ctx, "core.documentos.iniciar_subida", subida(entidad, tipos[capa]), {
        dryRun: true,
      });
      expect(r, `${clave} con tipo de ${capa}`).toBe("OK");
    }
  });

  it("rechaza un tipo de otra capa en cada entidad", async () => {
    const { ctx, entidades, tipos } = await escenario();
    for (const [clave, entidad] of Object.entries(entidades)) {
      const propia = CAPA_DE_ENTIDAD[clave as keyof typeof CAPA_DE_ENTIDAD];
      for (const [capa, tipoId] of Object.entries(tipos).filter(([c]) => c !== propia)) {
        const r = await codigo(ctx, "core.documentos.iniciar_subida", subida(entidad, tipoId), {
          dryRun: true,
        });
        expect(r, `${clave} con tipo de ${capa}`).toBe("UNPROCESSABLE");
      }
    }
  });

  it("no vincula a una entidad que no existe en la empresa (ni a otra empresa)", async () => {
    const { ctx, tipos } = await escenario();
    for (const tipo of ["cuenta", "instalacion", "persona"]) {
      const r = await codigo(
        ctx,
        "core.documentos.iniciar_subida",
        subida({ tipo, id: randomUUID() }, tipos[tipo]),
        { dryRun: true },
      );
      expect(r, tipo).toBe("NOT_FOUND");
    }
    // «Empresa» solo es la propia: el id de otra empresa no vale.
    const ajena = { tipo: "tenant", id: randomUUID() };
    expect(
      await codigo(ctx, "core.documentos.iniciar_subida", subida(ajena), { dryRun: true }),
    ).toBe("NOT_FOUND");
  });

  it("un actor sin nada a cargo no puede vincular a ninguna entidad", async () => {
    const { entidades, tipos } = await escenario();
    // Con el permiso de gestionar documentos concedido (pasa la autorización) y nada a cargo, lo
    // que decide es el alcance: ninguna entidad es visible, así que no existe para este actor.
    const acotado = contextoDePrueba({
      rol: "supervisor",
      alcance: { instalaciones: [] },
      excepciones: [{ permiso: "core:documentos.manage", conceder: true }],
    });
    for (const [clave, entidad] of Object.entries(entidades)) {
      const capa = CAPA_DE_ENTIDAD[clave as keyof typeof CAPA_DE_ENTIDAD];
      const r = await codigo(
        acotado.ctx,
        "core.documentos.iniciar_subida",
        subida(entidad, tipos[capa]),
        { dryRun: true },
      );
      expect(r, clave).toBe("NOT_FOUND");
    }
  });
});
