import { beforeEach, describe, expect, it } from "vitest";

import {
  capacidadesDelNucleo,
  executeCapability,
  limpiarRegistro,
  registrarCapacidades,
} from "../src";
import { capacidadesComercial } from "../src/comercial";
import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";

// CAR-211: contador de solicitudes nuevas, pendientes de Inicio y quién revisa lo «en revisión».
beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades([...capacidadesDelNucleo, ...capacidadesComercial]);
});

const OTRO = "0192f3a0-0000-7000-8000-0000000000b9";
const ahora = new Date("2026-11-06T12:00:00Z");
const sol = (id: string, estado: string, responsableId: string | null = null) => ({
  id,
  tenantId: TENANT_DE_PRUEBA,
  canal: "formulario_web",
  estado,
  textoOriginal: "Quiero cotizar",
  registradaPorTipo: "sistema",
  registradaPorId: null,
  asunto: null,
  nombre: null,
  empresa: null,
  email: null,
  telefono: null,
  rut: null,
  comuna: null,
  servicio: null,
  fuente: null,
  notasAgente: null,
  motivoDescarte: null,
  descartadaEn: null,
  convertidaEn: null,
  duplicadaDeId: null,
  negocioId: null,
  cuentaId: null,
  contactoId: null,
  responsableId,
  camposPropuestosAgente: [],
  createdAt: ahora,
  updatedAt: ahora,
});
const s = (n: number) => `0192f3a0-0000-7000-8000-0000000001${String(n).padStart(2, "0")}`;

function entorno(permisos: readonly string[], modulos = ["comercial"]) {
  return contextoDePrueba({
    modulosActivos: modulos,
    permisos,
    semilla: {
      solicitud: [
        sol(s(1), "nueva"),
        sol(s(2), "nueva"),
        sol(s(3), "en_revision", USUARIO_DE_PRUEBA.id),
        sol(s(4), "en_revision", OTRO),
        sol(s(5), "en_revision"),
        sol(s(6), "convertida"),
      ],
      user: [
        { id: USUARIO_DE_PRUEBA.id, name: "Ana Prueba", email: "ana@prueba.cl" },
        { id: OTRO, name: "Beto Revisor", email: "beto@prueba.cl" },
      ],
      membership: [
        { id: "m1", tenantId: TENANT_DE_PRUEBA, userId: USUARIO_DE_PRUEBA.id, rol: "owner", portales: ["erp"], estado: "activa" },
        { id: "m2", tenantId: TENANT_DE_PRUEBA, userId: OTRO, rol: "gerente", portales: ["erp"], estado: "activa" },
      ],
    },
  });
}
const GESTOR = ["comercial:solicitudes.read", "comercial:solicitudes.manage"];

describe("contador de solicitudes nuevas en el menú", () => {
  it("cuenta solo las «nuevas» y solo lo pedido", async () => {
    const { ctx } = entorno(GESTOR);
    const r = await executeCapability(ctx, "core.resumen.contadores", { campos: ["solicitudesNuevas"] });
    expect(r.ok && (r.data as { solicitudesNuevas: number; cuentas: null })).toMatchObject({ solicitudesNuevas: 2, cuentas: null });
  });
  it("sin el permiso de lectura o con el módulo apagado, null", async () => {
    const sinPermiso = await executeCapability(entorno([]).ctx, "core.resumen.contadores", { campos: ["solicitudesNuevas"] });
    expect(sinPermiso.ok && (sinPermiso.data as { solicitudesNuevas: null }).solicitudesNuevas).toBeNull();
    const sinModulo = await executeCapability(entorno(GESTOR, []).ctx, "core.resumen.contadores", { campos: ["solicitudesNuevas"] });
    expect(sinModulo.ok && (sinModulo.data as { solicitudesNuevas: null }).solicitudesNuevas).toBeNull();
  });
});

type Pend = { tipo: string; titulo: string; href: string }[];
const solicitudesDe = (r: { ok: boolean; data?: unknown }) =>
  ((r.ok ? r.data : []) as Pend).filter((p) => p.tipo === "solicitudes");

describe("Inicio: solicitudes nuevas o en revisión", () => {
  it("quien gestiona ve las nuevas y las en revisión a su cargo (suyas o sin responsable), no las de otro", async () => {
    const { ctx } = entorno(GESTOR);
    const items = solicitudesDe(await executeCapability(ctx, "core.inicio.pendientes", {}));
    expect(items.map((i) => i.titulo)).toEqual(["2 solicitudes nuevas", "2 solicitudes en revisión a tu cargo"]);
    expect(items.map((i) => i.href)).toEqual(["/solicitudes?estado=nueva", "/solicitudes?estado=en_revision"]);
  });
  it("quien solo puede leer, o sin el módulo, no ve nada de solicitudes", async () => {
    expect(solicitudesDe(await executeCapability(entorno(["comercial:solicitudes.read"]).ctx, "core.inicio.pendientes", {}))).toEqual([]);
    expect(solicitudesDe(await executeCapability(entorno(GESTOR, []).ctx, "core.inicio.pendientes", {}))).toEqual([]);
  });
});

describe("quién revisa lo «en revisión»", () => {
  it("la lista y la ficha traen el nombre del responsable; sin responsable, null", async () => {
    const { ctx } = entorno(GESTOR);
    const lista = await executeCapability(ctx, "comercial.solicitudes.list", {});
    const items = (lista.ok ? lista.data : { items: [] }) as { items: { id: string; responsableNombre: string | null }[] };
    const por = new Map(items.items.map((i) => [i.id, i.responsableNombre]));
    expect(por.get(s(3))).toBe("Ana Prueba");
    expect(por.get(s(4))).toBe("Beto Revisor");
    expect(por.get(s(5))).toBeNull();
    const ficha = await executeCapability(ctx, "comercial.solicitudes.get", { id: s(4) });
    expect(ficha.ok && (ficha.data as { solicitud: { responsableNombre: string } }).solicitud.responsableNombre).toBe("Beto Revisor");
  });
});
