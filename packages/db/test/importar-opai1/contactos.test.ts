import { describe, expect, it } from "vitest";

import { MOTIVO_NN } from "../../scripts/importar-opai1/contactos";
import { estadoVacio } from "../../scripts/importar-opai1/destino-tipos";
import { calcularPlan } from "../../scripts/importar-opai1/plan";
import { fixture } from "./memoria";

const plan = (destino = estadoVacio()) => calcularPlan(fixture(), destino);
const por = (p: ReturnType<typeof plan>, id: string) => p.contactos.find((d) => d.idOpai1 === id);

describe("plan de contactos", () => {
  it("normaliza correo, teléfono y roles (notas de crédito → facturación)", () => {
    const d = por(plan(), "con-c1");
    expect(d?.accion).toBe("crear");
    expect(d?.datos).toMatchObject({
      email: "ana.prueba@ejemplo.test",
      telefono: "+56987654321",
      cargo: "Gerenta",
      roles: ["facturacion"],
      cuentaId: "nueva:acc-a1",
    });
  });

  it("mismo correo en la misma cuenta se funde con el primero", () => {
    expect(por(plan(), "con-c2")).toMatchObject({
      accion: "omitido",
      motivo: "duplicado_correo_misma_cuenta",
      fusionaCon: "con-c1",
    });
  });

  it("mismo correo en cuentas distintas: conflicto N–N (CRM PR 2), sin resolver", () => {
    const p = plan();
    expect(por(p, "con-c4")).toMatchObject({ accion: "conflicto", motivo: MOTIVO_NN, datos: null });
    expect(por(p, "con-c5")).toMatchObject({ accion: "conflicto", motivo: MOTIVO_NN });
  });

  it("principal repetido en una cuenta: gana el más reciente y se avisa", () => {
    const p = plan();
    expect(por(p, "con-c3")?.datos?.esPrincipal).toBe(true);
    expect(por(p, "con-c1")?.datos?.esPrincipal).toBe(false);
    expect(p.avisos).toContainEqual({ codigo: "principal_repetido", idOpai1: "con-c1" });
  });

  it("sin correo: una por fila y propuesta por teléfono; cesión pendiente se avisa", () => {
    const p = plan();
    expect(por(p, "con-c6")?.accion).toBe("crear");
    expect(por(p, "con-c7")?.accion).toBe("crear");
    expect(p.propuestas).toContainEqual({
      entidad: "contacto",
      criterio: "telefono",
      idsOpai1: ["con-c6", "con-c7"],
      idsDestino: [],
    });
    expect(p.avisos).toContainEqual({ codigo: "rol_cesion_pendiente_crm_pr2", idOpai1: "con-c6" });
    expect(por(p, "con-c6")?.datos?.roles).toEqual(["operacional"]);
  });

  it("cuenta inexistente se omite; correo y teléfono inválidos se avisan", () => {
    const p = plan();
    expect(por(p, "con-c8")).toMatchObject({ accion: "omitido", motivo: "cuenta_inexistente" });
    expect(p.avisos).toContainEqual({ codigo: "correo_invalido", idOpai1: "con-c9" });
    expect(p.avisos).toContainEqual({ codigo: "telefono_invalido", idOpai1: "con-c9" });
  });

  it("contra 2.0: vincula por correo en la misma cuenta; en otra cuenta es N–N", () => {
    const destino = estadoVacio();
    destino.cuentas.push({ id: "c-1", nombre: "Alfa", razonSocial: null, rut: "76111111-6" });
    destino.cuentas.push({ id: "c-5", nombre: "Gamma", razonSocial: null, rut: null });
    const base = { apellidos: "X", telefono: null, cargo: null, esPrincipal: false, roles: [] };
    destino.contactos.push(
      { ...base, id: "k-1", cuentaId: "c-1", nombres: "A", email: "bruno@ejemplo.test" },
      { ...base, id: "k-2", cuentaId: "c-5", nombres: "B", email: "ana.prueba@ejemplo.test" },
    );
    const p = plan(destino);
    expect(por(p, "con-c3")).toMatchObject({
      accion: "actualizar",
      motivo: "vincula_por_correo",
      destinoId: "k-1",
    });
    expect(por(p, "con-c1")).toMatchObject({ accion: "conflicto", motivo: MOTIVO_NN });
  });
});
