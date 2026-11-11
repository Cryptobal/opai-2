import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { contribuyenteNoConfigurado, contribuyenteSimulado } from "@opai/integrations";
import type { Plan } from "@opai/db/importar-opai1";

import { fijarFuenteContribuyente } from "../src";
import { resumenSiiDelPlan } from "../src/comercial/importar-1-0-sii";
import { trabajoConsultarContribuyenteSii } from "../src/core/maestros/cuentas-sii-trabajo";
import { contextoDePrueba, TENANT_DE_PRUEBA } from "../src/testing";
import { dato, reiniciar } from "./maestros-ayuda";

// Datos ficticios (CAR-156).
const LISTA = "0192f3a0-0000-7000-8000-00000000ac01";
const INCOMPLETA = "0192f3a0-0000-7000-8000-00000000ac02";
const CONTACTO = "0192f3a0-0000-7000-8000-00000000ac03";
const R1 = "76418552-8";
const R2 = "77777777-7";
const R3 = "11111111-1";

const sii = () =>
  contribuyenteSimulado({
    [R1]: {
      estado: "ok",
      datos: {
        rut: R1,
        razonSocial: "UNO FICTICIA SPA",
        actividades: [{ codigo: "801000", descripcion: "Seguridad", afectaIva: true }],
        direccion: "Calle Uno 1",
        comuna: "Providencia",
        ciudad: "Santiago",
        correoIntercambio: null,
        inicioActividades: "2015-01-02",
      },
    },
  });

function ctx() {
  return contextoDePrueba({
    semilla: {
      tenant: [
        { id: TENANT_DE_PRUEBA, slug: "t", nombre: "T", vertical: "seguridad", estado: "activo" },
      ],
      cuenta: [
        {
          id: LISTA, tenantId: TENANT_DE_PRUEBA, nombre: "A Lista", rut: R1, estado: "cliente_activo", createdAt: new Date(),
          razonSocial: "Uno", giro: "Seguridad", calle: "Calle Uno 1", comuna: "Providencia",
        },
        { id: INCOMPLETA, tenantId: TENANT_DE_PRUEBA, nombre: "B Incompleta", rut: R2, estado: "prospecto", createdAt: new Date() },
      ],
      contactoCuenta: [
        { id: CONTACTO, tenantId: TENANT_DE_PRUEBA, cuentaId: LISTA, contactoId: CONTACTO, roles: ["facturacion"] },
      ],
    },
  });
}

beforeEach(() => {
  reiniciar();
  fijarFuenteContribuyente(sii());
});
afterEach(() => fijarFuenteContribuyente(null));

describe("lista de cuentas · «Lista para facturar»", () => {
  it("cada fila trae el indicador con el mismo dominio que la ficha, sin consultar al SII", async () => {
    const f = sii();
    fijarFuenteContribuyente(f);
    const c = ctx();
    const r = await dato<{ items: { id: string; facturar: { lista: boolean; faltan: string[] } }[] }>(
      c.ctx,
      "core.cuentas.list",
      {},
    );
    const por = Object.fromEntries(r.items.map((x) => [x.id, x.facturar]));
    expect(por[LISTA]).toEqual({ lista: true, faltan: [] });
    expect(por[INCOMPLETA]).toEqual({
      lista: false,
      faltan: ["razonSocial", "giro", "calle", "comuna", "destinatario"],
    });
    const ficha = await dato(c.ctx, "core.cuentas.facturable", { id: INCOMPLETA });
    expect(ficha).toEqual(por[INCOMPLETA]);
    expect(f.llamadas).toEqual([]);
  });
});

const decision = (idOpai1: string, rut: string | null, accion = "crear") => ({
  entidad: "cuenta" as const, idOpai1, accion: accion as "crear", motivo: null, destinoId: null,
  fusionaCon: null, campos: [], conflictos: [],
  datos: {
    nombre: idOpai1, razonSocial: null, rut, giro: null, calle: null, comuna: null, ciudad: null,
    emailDte: null, estado: "prospecto" as const, escrituraNotaria: null, escrituraFecha: null,
    clienteDesde: null, clienteHasta: null, representanteNombre: null, representanteRut: null,
  },
});
const plan: Pick<Plan, "cuentas"> = {
  cuentas: [decision("a", R1), decision("b", R2), decision("c", null), decision("d", R3, "omitido")],
};

describe("importador · consulta al SII en lote", () => {
  it("simular solo lee la caché: no encola ni llama al proveedor", async () => {
    const f = sii();
    fijarFuenteContribuyente(f);
    const c = ctx();
    await trabajoConsultarContribuyenteSii.ejecutar(c.ctx, { rut: R1 });
    const r = await resumenSiiDelPlan(c.ctx, plan, { encolar: false });
    expect(r).toEqual({
      estado: "disponible", cuentasConRut: 2, enCache: 1, completables: 1, porConsultar: 1, encoladas: 0,
    });
    expect(f.llamadas).toEqual([R1]);
    expect(c.tabla("trabajo") ?? []).toHaveLength(0);
  });

  it("aplicar encola los RUT sin caché, una vez por día; sin key no encola ni inventa", async () => {
    const c = ctx();
    const r = await resumenSiiDelPlan(c.ctx, plan, { encolar: true });
    expect(r).toMatchObject({ enCache: 0, porConsultar: 2, encoladas: 2 });
    const otra = await resumenSiiDelPlan(c.ctx, plan, { encolar: true });
    expect(otra.encoladas).toBe(0);
    expect(c.tabla("trabajo") ?? []).toHaveLength(2);
    fijarFuenteContribuyente(contribuyenteNoConfigurado());
    const c2 = ctx();
    const sinKey = await resumenSiiDelPlan(c2.ctx, plan, { encolar: true });
    expect(sinKey).toMatchObject({ estado: "no_configurado", encoladas: 0, completables: 0 });
    expect(c2.tabla("trabajo") ?? []).toHaveLength(0);
  });
});
