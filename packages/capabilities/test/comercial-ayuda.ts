import { capacidadesDelNucleo, limpiarRegistro, registrarCapacidades } from "../src";
import { capacidadesComercial } from "../src/comercial";
import { limpiarModulos } from "../src/module";
import { registrarModuloComercial } from "./comercial-modulo";
import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";
import type { AgenteContexto, Alcance } from "../src/types";
import type { Rol } from "@opai/domain";

export const E = "0192f3a0-0000-7000-8000-0000000000e0";
export const CU = "0192f3a0-0000-7000-8000-0000000000c1";
export const CU2 = "0192f3a0-0000-7000-8000-0000000000c2";
export const I1 = "0192f3a0-0000-7000-8000-0000000000f1";
export const I2 = "0192f3a0-0000-7000-8000-0000000000f2";
export const K1 = "0192f3a0-0000-7000-8000-0000000000a1";
export const K2 = "0192f3a0-0000-7000-8000-0000000000a2";
export const MP = "0192f3a0-0000-7000-8000-0000000000d1";
export const MPO = "0192f3a0-0000-7000-8000-0000000000d2";
export const N1 = "0192f3a0-0000-7000-8000-0000000000b1";

export const etapaId = (n: number) => `0192f3a0-0000-7000-8000-0000000000e${n}`;

const etapa = (n: number, nombre: string, tipo: string, prob: number, exige: string[]) => ({
  id: etapaId(n),
  tenantId: TENANT_DE_PRUEBA,
  embudoId: E,
  nombre,
  orden: n,
  tipo,
  probabilidad: prob,
  tono: "neutral",
  exige,
  activa: true,
});

/**
 * Siembra base, más N1 (negocio de CU con instalación I1 y los contactos K1/K2) para los tests de
 * alcance (ADR-022) que necesitan el mismo negocio visible desde contextos con permisos distintos.
 */
export function semillaComercial(opts: { conNegocio?: boolean } = {}) {
  const base = {
    tenant: [
      {
        id: TENANT_DE_PRUEBA,
        slug: "gard",
        nombre: "Gard",
        vertical: "seguridad",
        estado: "activo",
      },
    ],
    user: [{ id: USUARIO_DE_PRUEBA.id, name: "Ana", email: "ana@prueba.cl" }],
    cuenta: [
      { id: CU, tenantId: TENANT_DE_PRUEBA, nombre: "Cuenta 1", estado: "prospecto" },
      { id: CU2, tenantId: TENANT_DE_PRUEBA, nombre: "Cuenta 2", estado: "prospecto" },
    ],
    instalacion: [
      { id: I1, tenantId: TENANT_DE_PRUEBA, cuentaId: CU, nombre: "Planta 1", estado: "prospecto" },
      {
        id: I2,
        tenantId: TENANT_DE_PRUEBA,
        cuentaId: CU2,
        nombre: "Planta 2",
        estado: "prospecto",
      },
    ],
    contacto: [
      {
        id: K1,
        tenantId: TENANT_DE_PRUEBA,
        cuentaId: CU,
        nombres: "Pía",
        apellidos: "Rol",
        esPrincipal: true,
      },
      {
        id: K2,
        tenantId: TENANT_DE_PRUEBA,
        cuentaId: CU,
        nombres: "Leo",
        apellidos: "Paz",
        esPrincipal: false,
      },
    ],
    embudo: [
      { id: E, tenantId: TENANT_DE_PRUEBA, nombre: "Ventas", porDefecto: true, activo: true },
    ],
    etapa: [
      etapa(0, "Prospecto", "abierta", 10, []),
      etapa(1, "Calificado", "abierta", 20, []),
      etapa(2, "Visita técnica", "abierta", 35, ["monto"]),
      etapa(3, "Propuesta enviada", "abierta", 50, ["monto", "fecha_cierre"]),
      etapa(6, "Adjudicado", "ganada", 100, ["inicio_servicio"]),
      etapa(7, "Perdido", "perdida", 0, ["motivo_perdida"]),
    ],
    motivoPerdida: [
      {
        id: MP,
        tenantId: TENANT_DE_PRUEBA,
        codigo: "precio",
        nombre: "Precio",
        exigeDetalle: false,
        activo: true,
        orden: 0,
      },
      {
        id: MPO,
        tenantId: TENANT_DE_PRUEBA,
        codigo: "otro",
        nombre: "Otro",
        exigeDetalle: true,
        activo: true,
        orden: 1,
      },
    ],
  };
  if (!opts.conNegocio) return base;
  return {
    ...base,
    negocio: [
      {
        id: N1,
        tenantId: TENANT_DE_PRUEBA,
        cuentaId: CU,
        embudoId: E,
        etapaId: etapaId(0),
        estado: "abierto",
        titulo: "Guardias · Planta 1",
        probabilidad: 10,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-01T00:00:00Z"),
      },
    ],
    negocioInstalacion: [
      {
        id: "0192f3a0-0000-7000-8000-0000000000b4",
        tenantId: TENANT_DE_PRUEBA,
        negocioId: N1,
        instalacionId: I1,
        tipo: "nueva",
      },
    ],
    negocioContacto: [
      {
        id: "0192f3a0-0000-7000-8000-0000000000b2",
        tenantId: TENANT_DE_PRUEBA,
        negocioId: N1,
        contactoId: K1,
        rol: "decisor",
        esPrincipal: true,
      },
      {
        id: "0192f3a0-0000-7000-8000-0000000000b3",
        tenantId: TENANT_DE_PRUEBA,
        negocioId: N1,
        contactoId: K2,
        rol: "tecnico",
        esPrincipal: false,
      },
    ],
  };
}

export function reiniciarComercial() {
  limpiarRegistro();
  limpiarModulos();
  registrarCapacidades([...capacidadesDelNucleo, ...capacidadesComercial]);
  registrarModuloComercial();
}

/** Contexto de prueba con el módulo comercial activo y la siembra lista. */
export function ctxComercial(
  opts: {
    actor?: "humano" | "agente";
    agente?: Partial<AgenteContexto>;
    rol?: Rol;
    permisos?: string[];
    alcance?: Alcance;
    excepciones?: { permiso: string; conceder: boolean }[];
    /** Siembra también N1 (negocio de CU con instalación I1 y los contactos K1/K2). */
    conNegocio?: boolean;
  } = {},
) {
  const base = {
    semilla: semillaComercial(opts.conNegocio ? { conNegocio: true } : {}),
    modulosActivos: ["comercial"],
    ...(opts.rol ? { rol: opts.rol } : {}),
    ...(opts.permisos ? { permisos: opts.permisos } : {}),
    ...(opts.alcance ? { alcance: opts.alcance } : {}),
    ...(opts.excepciones ? { excepciones: opts.excepciones } : {}),
  } as const;
  if (opts.actor === "agente") {
    return contextoDePrueba({
      ...base,
      actor: { tipo: "agent", id: K1, viaUserId: USUARIO_DE_PRUEBA.id },
      agente: {
        apiKeyId: K1,
        nombre: "Agente",
        presupuestoMensualMicro: null,
        autonomia: {},
        ...opts.agente,
      },
    });
  }
  return contextoDePrueba(base);
}
