import { beforeEach, describe, expect, it } from "vitest";

import { contextoDePrueba, TENANT_DE_PRUEBA } from "../src/testing";
import { codigo, dato, reiniciar } from "./maestros-ayuda";

beforeEach(reiniciar);

const uid = (n: number) => `0192f3a0-0000-7000-8000-${String(n).padStart(12, "0")}`;
const hoyMas = (dias: number) =>
  new Date(Date.now() + dias * 86_400_000).toISOString().slice(0, 10);

type Fila = {
  id: string;
  nombre: string;
  vigencia: string;
  entidad: { tipo: string; id: string; nombre: string | null } | null;
  firma: string | null;
};
type Pagina = { items: Fila[]; siguiente: string | null; total: number };

/** Seis documentos: dos de una persona, uno de cuenta, uno de instalación y uno de empresa. */
function escenario(opciones: Parameters<typeof contextoDePrueba>[0] = {}) {
  const p = contextoDePrueba(opciones);
  const { tabla } = p;
  const t = TENANT_DE_PRUEBA;
  tabla("persona").push({ id: uid(1), tenantId: t, nombres: "Camila", apellidos: "Herrera" });
  tabla("cuenta").push({ id: uid(2), tenantId: t, nombre: "Logística Andina" });
  tabla("instalacion").push({ id: uid(3), tenantId: t, nombre: "Bodega Lampa", cuentaId: uid(2) });
  tabla("documentoTipo").push({
    id: uid(50),
    tenantId: t,
    codigo: "os10",
    nombre: "Credencial OS-10",
    capa: "persona",
    diasAlerta: 60,
  });
  const docs: [number, string, string | null, string | null, [string, string], string[]?][] = [
    [10, "credencial-camila.pdf", "Credencial", hoyMas(45), ["persona", uid(1)], ["os10"]],
    [11, "anexo-jornada.pdf", null, null, ["persona", uid(1)]],
    [12, "certificado-mutual.pdf", "Certificado mutual", hoyMas(200), ["cuenta", uid(2)]],
    [13, "poliza.pdf", "Póliza RC", hoyMas(-5), ["instalacion", uid(3)]],
    [14, "escritura.pdf", null, hoyMas(10), ["tenant", t]],
  ];
  docs.forEach(([n, nombre, titulo, vence, [tipo, id], etiquetas], i) => {
    tabla("documento").push({
      id: uid(n),
      tenantId: t,
      nombre,
      titulo,
      mime: "application/pdf",
      tamano: 10,
      estado: "disponible",
      version: 1,
      tipoId: n === 10 ? uid(50) : null,
      venceEn: vence ? new Date(`${vence}T00:00:00.000Z`) : null,
      etiquetas: etiquetas ?? [],
      visibleEn: [],
      createdAt: new Date(Date.UTC(2026, 9, 1 + i)),
    });
    tabla("documentoVinculo").push({
      tenantId: t,
      documentoId: uid(n),
      entidadTipo: tipo,
      entidadId: id,
      rol: "propietario",
    });
  });
  // Archivado: no aparece salvo que se pida.
  tabla("documento").push({
    id: uid(15),
    tenantId: t,
    nombre: "viejo.pdf",
    mime: "application/pdf",
    tamano: 1,
    estado: "archivado",
    version: 1,
    etiquetas: [],
    visibleEn: [],
    createdAt: new Date(Date.UTC(2026, 8, 1)),
  });
  tabla("documentoVinculo").push({
    tenantId: t,
    documentoId: uid(15),
    entidadTipo: "tenant",
    entidadId: t,
    rol: "propietario",
  });
  return p;
}

describe("core.documentos.explorar", () => {
  it("lista con total, propietario y nombre, y excluye los archivados", async () => {
    const { ctx } = escenario();
    const r = await dato<Pagina>(ctx, "core.documentos.explorar", {});
    expect(r.total).toBe(5);
    expect(r.items.map((d) => d.nombre)).not.toContain("viejo.pdf");
    const camila = r.items.find((d) => d.id === uid(10));
    expect(camila?.entidad).toEqual({ tipo: "persona", id: uid(1), nombre: "Camila Herrera" });
    expect(r.items.find((d) => d.id === uid(14))?.entidad?.tipo).toBe("tenant");
    const con = await dato<Pagina>(ctx, "core.documentos.explorar", { incluirArchivados: true });
    expect(con.total).toBe(6);
  });

  it("busca por nombre, título y etiqueta, y no por el contenido", async () => {
    const { ctx } = escenario();
    const ids = async (q: string) =>
      (await dato<Pagina>(ctx, "core.documentos.explorar", { q })).items.map((d) => d.id);
    expect(await ids("MUTUAL")).toEqual([uid(12)]);
    expect(await ids("póliza")).toEqual([uid(13)]);
    expect(await ids("os10")).toEqual([uid(10)]);
    expect(await ids("no-existe")).toEqual([]);
  });

  it("filtra por entidad propietaria, tipo y vigencia con los días de alerta de cada tipo", async () => {
    const { ctx } = escenario();
    const filtrar = async (f: object) =>
      (await dato<Pagina>(ctx, "core.documentos.explorar", f)).items.map((d) => d.id).sort();
    expect(await filtrar({ entidadTipo: "persona" })).toEqual([uid(10), uid(11)]);
    expect(await filtrar({ tipoId: uid(50) })).toEqual([uid(10)]);
    expect(await filtrar({ vigencia: "vencido" })).toEqual([uid(13)]);
    expect(await filtrar({ vigencia: "sin_fecha" })).toEqual([uid(11)]);
    // La credencial vence en 45 días: por vencer con su alerta de 60; la escritura (10 días) con la de 30.
    expect(await filtrar({ vigencia: "por_vencer" })).toEqual([uid(10), uid(14)]);
    expect(await filtrar({ vigencia: "vigente" })).toEqual([uid(12)]);
    const r = await dato<Pagina>(ctx, "core.documentos.explorar", {
      vigencia: "por_vencer",
      entidadTipo: "tenant",
    });
    expect(r.items.map((d) => d.vigencia)).toEqual(["por_vencer"]);
  });

  it("pagina por cursor sin repetir ni saltar filas, en cada orden", async () => {
    const { ctx } = escenario();
    for (const orden of ["recientes", "nombre", "vence"] as const) {
      const vistos: string[] = [];
      let cursor: string | undefined;
      for (let i = 0; i < 10; i++) {
        const r: Pagina = await dato(ctx, "core.documentos.explorar", {
          orden,
          limite: 2,
          ...(cursor ? { cursor } : {}),
        });
        vistos.push(...r.items.map((d) => d.id));
        if (!r.siguiente) break;
        cursor = r.siguiente;
      }
      expect(new Set(vistos).size, orden).toBe(5);
      expect(vistos, orden).toHaveLength(5);
    }
    const porVence = await dato<Pagina>(ctx, "core.documentos.explorar", { orden: "vence" });
    expect(porVence.items.map((d) => d.id)).toEqual([uid(13), uid(14), uid(10), uid(12), uid(11)]);
    const porNombre = await dato<Pagina>(ctx, "core.documentos.explorar", { orden: "nombre" });
    expect(porNombre.items[0]?.nombre).toBe("anexo-jornada.pdf");
  });

  it("rechaza un cursor que esta consulta no devolvería", async () => {
    const { ctx } = escenario();
    expect(await codigo(ctx, "core.documentos.explorar", { cursor: uid(15) })).toBe("NOT_FOUND");
    expect(await codigo(ctx, "core.documentos.explorar", { cursor: "no-es-uuid" })).toBe(
      "INVALID_INPUT",
    );
  });

  it("oculta el nombre del propietario a quien no puede leer ese tipo de entidad", async () => {
    const { ctx } = escenario({ permisos: ["core:documentos.read"] });
    const r = await dato<Pagina>(ctx, "core.documentos.explorar", {});
    const camila = r.items.find((d) => d.id === uid(10));
    expect(camila?.entidad).toEqual({ tipo: "persona", id: uid(1), nombre: null });
    expect(JSON.stringify(r)).not.toContain("Camila");
    expect(JSON.stringify(r)).not.toContain("Lampa");
  });

  it("exige documentos.read", async () => {
    const { ctx } = escenario({ permisos: ["core:personas.read"] });
    expect(await codigo(ctx, "core.documentos.explorar", {})).toBe("FORBIDDEN");
  });

  it("deja en la auditoría solo los ids de la página revelada (documentos y personas nombradas)", async () => {
    const { ctx, eventos } = escenario();
    await dato<Pagina>(ctx, "core.documentos.explorar", { limite: 2, orden: "nombre" });
    const e = eventos.find((x) => x.capability === "core.documentos.explorar");
    // Página por nombre: anexo-jornada (uid 11) y certificado-mutual (uid 12) + persona nombrada (uid 1).
    expect(e?.payload).toEqual({ ids: [uid(11), uid(12), uid(1)] });
    expect(JSON.stringify(e)).not.toContain("Camila");
    expect(JSON.stringify(e)).not.toContain("jornada");
  });

  it("muestra el estado de firma si el actor puede ver firmas", async () => {
    const { ctx, tabla } = escenario();
    tabla("solicitudFirma").push({
      id: uid(90),
      tenantId: TENANT_DE_PRUEBA,
      documentoId: uid(11),
      estado: "en_curso",
    });
    tabla("solicitudFirma").push({
      id: uid(91),
      tenantId: TENANT_DE_PRUEBA,
      documentoId: uid(12),
      estado: "completada",
    });
    const r = await dato<Pagina>(ctx, "core.documentos.explorar", {});
    expect(r.items.find((d) => d.id === uid(11))?.firma).toBe("pendiente");
    expect(r.items.find((d) => d.id === uid(12))?.firma).toBe("firmado");
    expect(r.items.find((d) => d.id === uid(10))?.firma).toBeNull();
  });
});
