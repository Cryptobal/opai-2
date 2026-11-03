// Carga real del plan idempotente (Brief 07 / CAR-25). Solo vía capacidad o CLI autorizado; siempre
// dentro de `enTransaccion` con rol `opai_app`.
/* eslint-disable max-lines -- apply transaccional por entidad (CAR-25) */
import type { TenantTx } from "../../src/transaccion";
import type { Decision } from "./comun";
import { MOTIVO_VINCULO_PERSONA } from "./contactos";
import type { DatosCuenta } from "./cuentas";
import { SISTEMA_OPAI1, type EntidadImportada } from "./destino-tipos";
import type { DatosInstalacion } from "./instalaciones";
import type { Plan } from "./plan";
import type { DatosContacto } from "./contactos-datos";
import type { DatosProgramacion } from "./recurrentes";

export type MapasImportacion = {
  cuenta: Map<string, string>;
  contacto: Map<string, string>;
  instalacion: Map<string, string>;
  programacion: Map<string, string>;
};

export type ResultadoAplicacion = {
  mapas: MapasImportacion;
  aplicadas: {
    cuentas: number;
    contactos: number;
    instalaciones: number;
    programaciones: number;
  };
  omitidas: number;
};

const cuentaPrisma = (d: DatosCuenta) => ({
  nombre: d.nombre,
  razonSocial: d.razonSocial,
  rut: d.rut,
  giro: d.giro,
  calle: d.calle,
  comuna: d.comuna,
  ciudad: d.ciudad,
  emailDte: d.emailDte,
});

async function unicoPrincipal(tx: TenantTx, cuentaId: string, contactoId: string) {
  await tx.contactoCuenta.updateMany({
    where: { cuentaId, esPrincipal: true, contactoId: { not: contactoId } },
    data: { esPrincipal: false },
  });
  await tx.contacto.updateMany({
    where: { cuentaId, esPrincipal: true, id: { not: contactoId } },
    data: { esPrincipal: false },
  });
}

async function registrarExterno(
  tx: TenantTx,
  tenantId: string,
  entidad: EntidadImportada,
  idOpai1: string,
  entidadId: string,
) {
  await tx.idExterno.upsert({
    where: {
      tenantId_sistema_entidadTipo_idExterno: {
        tenantId,
        sistema: SISTEMA_OPAI1,
        entidadTipo: entidad,
        idExterno: idOpai1,
      },
    },
    create: { tenantId, sistema: SISTEMA_OPAI1, entidadTipo: entidad, idExterno: idOpai1, entidadId },
    update: { entidadId },
  });
}

async function upsertVinculo(
  tx: TenantTx,
  tenantId: string,
  contactoId: string,
  cuentaId: string,
  datos: Pick<DatosContacto, "cargo" | "roles" | "esPrincipal">,
) {
  if (datos.esPrincipal) await unicoPrincipal(tx, cuentaId, contactoId);
  const existente = await tx.contactoCuenta.findFirst({ where: { contactoId, cuentaId } });
  if (existente) {
    await tx.contactoCuenta.update({
      where: { id: existente.id },
      data: { cargo: datos.cargo, roles: datos.roles, esPrincipal: datos.esPrincipal },
    });
    const c = await tx.contacto.findFirst({ where: { id: contactoId }, select: { cuentaId: true } });
    if (c?.cuentaId === cuentaId) {
      await tx.contacto.update({
        where: { id: contactoId },
        data: { cargo: datos.cargo, roles: datos.roles, esPrincipal: datos.esPrincipal },
      });
    }
    return;
  }
  await tx.contactoCuenta.create({
    data: {
      tenantId,
      contactoId,
      cuentaId,
      cargo: datos.cargo,
      roles: datos.roles,
      esPrincipal: datos.esPrincipal,
    },
  });
}

function resolverCuentaId(mapas: MapasImportacion, clave: string): string {
  if (clave.startsWith("nueva:")) {
    const id = mapas.cuenta.get(clave.slice(6));
    if (!id) throw new Error(`Cuenta no resuelta para ${clave}`);
    return id;
  }
  return clave;
}

function resolverInstalacionId(mapas: MapasImportacion, clave: string): string | null {
  if (clave.startsWith("nueva:")) {
    return mapas.instalacion.get(clave.slice(6)) ?? null;
  }
  return clave;
}

const fechaOp = (iso: string | null) => (iso ? new Date(iso) : null);

async function aplicarProgramaciones(
  tx: TenantTx,
  tenantId: string,
  decisiones: readonly Decision<DatosProgramacion>[],
  mapas: MapasImportacion,
): Promise<number> {
  let n = 0;
  for (const d of decisiones) {
    if (d.accion === "sin_cambios" && d.destinoId) {
      mapas.programacion.set(d.idOpai1, d.destinoId);
      await registrarExterno(tx, tenantId, "programacion_recurrente", d.idOpai1, d.destinoId);
      continue;
    }
    if (!d.datos || d.accion !== "crear") continue;
    const cuentaId = resolverCuentaId(mapas, d.datos.cuentaId);
    const instalacionId = d.datos.instalacionId
      ? resolverInstalacionId(mapas, d.datos.instalacionId)
      : null;
    if (d.datos.instalacionId && !instalacionId) {
      throw new Error(`Instalación no resuelta para programación ${d.idOpai1}`);
    }
    const p = await tx.ventasProgramacion.create({
      data: {
        tenantId,
        cuentaId,
        instalacionId,
        nombre: d.datos.nombre,
        activa: d.datos.activa,
        tipoDte: d.datos.tipoDte,
        diaGeneracion: d.datos.diaGeneracion,
        moneda: d.datos.moneda,
        plazoPagoDias: d.datos.plazoPagoDias,
        facturaTiming: d.datos.facturaTiming,
        facturaDia: d.datos.facturaDia,
        facturaMesRelativo: d.datos.facturaMesRelativo,
        diasFacturacion: d.datos.diasFacturacion,
        modoPeriodoFacturado: d.datos.modoPeriodoFacturado,
        politicaTextoPeriodo: d.datos.politicaTextoPeriodo,
        montoVariable: d.datos.montoVariable,
        autoEnvioProforma: d.datos.autoEnvioProforma,
        autoEnvioEstadoPago: d.datos.autoEnvioEstadoPago,
        notas: d.datos.notas,
        referenciasAdicionales: d.datos.referenciasAdicionales as object,
        proximaEjecucionEn: fechaOp(d.datos.proximaEjecucionEn),
        ultimaEjecucionEn: fechaOp(d.datos.ultimaEjecucionEn),
      },
    });
    for (const [orden, l] of d.datos.lineas.entries()) {
      await tx.ventasProgramacionLinea.create({
        data: { tenantId, programacionId: p.id, orden, glosa: l.glosa, monto: l.monto },
      });
    }
    for (const [orden, cidOpai1] of d.datos.destinatariosContactoOpai1Ids.entries()) {
      const contactoId = mapas.contacto.get(cidOpai1);
      if (!contactoId) continue;
      await tx.ventasProgramacionDestinatario.create({
        data: { tenantId, programacionId: p.id, contactoId, orden },
      });
    }
    mapas.programacion.set(d.idOpai1, p.id);
    await registrarExterno(tx, tenantId, "programacion_recurrente", d.idOpai1, p.id);
    n += 1;
  }
  return n;
}

async function aplicarCuentas(
  tx: TenantTx,
  tenantId: string,
  decisiones: readonly Decision<DatosCuenta>[],
  mapas: MapasImportacion,
): Promise<number> {
  let n = 0;
  for (const d of decisiones) {
    if (d.fusionaCon !== null) {
      if (d.accion === "omitido" || d.accion === "sin_cambios") {
        const canon = mapas.cuenta.get(d.fusionaCon);
        if (canon) mapas.cuenta.set(d.idOpai1, canon);
      }
      continue;
    }
    if (!d.datos || d.accion === "conflicto" || d.accion === "omitido") continue;
    if (d.accion === "sin_cambios" && d.destinoId) {
      mapas.cuenta.set(d.idOpai1, d.destinoId);
      await registrarExterno(tx, tenantId, "cuenta", d.idOpai1, d.destinoId);
      continue;
    }
    const data = cuentaPrisma(d.datos);
    if (d.accion === "crear") {
      const c = await tx.cuenta.create({ data: { tenantId, ...data } });
      mapas.cuenta.set(d.idOpai1, c.id);
      await registrarExterno(tx, tenantId, "cuenta", d.idOpai1, c.id);
      n += 1;
    } else if (d.accion === "actualizar" && d.destinoId) {
      await tx.cuenta.update({ where: { id: d.destinoId }, data });
      mapas.cuenta.set(d.idOpai1, d.destinoId);
      await registrarExterno(tx, tenantId, "cuenta", d.idOpai1, d.destinoId);
      n += 1;
    }
  }
  return n;
}

async function aplicarContactos(
  tx: TenantTx,
  tenantId: string,
  decisiones: readonly Decision<DatosContacto>[],
  mapas: MapasImportacion,
): Promise<number> {
  let n = 0;
  const personaDe = (idOpai1: string) => {
    const directo = mapas.contacto.get(idOpai1);
    if (directo) return directo;
    const d = decisiones.find((x) => x.idOpai1 === idOpai1);
    if (d?.fusionaCon) return mapas.contacto.get(d.fusionaCon) ?? null;
    return null;
  };

  for (const d of decisiones) {
    if (d.accion === "conflicto" || d.accion === "omitido") {
      if (d.fusionaCon && d.accion === "omitido") {
        const p = personaDe(d.fusionaCon);
        if (p) mapas.contacto.set(d.idOpai1, p);
      }
      continue;
    }
    if (!d.datos) continue;

    const cuentaId = resolverCuentaId(mapas, d.datos.cuentaId);

    if (d.motivo === MOTIVO_VINCULO_PERSONA && d.fusionaCon) {
      const personId = personaDe(d.fusionaCon);
      if (!personId) throw new Error(`Persona no resuelta para vínculo ${d.idOpai1}`);
      await upsertVinculo(tx, tenantId, personId, cuentaId, d.datos);
      mapas.contacto.set(d.idOpai1, personId);
      await registrarExterno(tx, tenantId, "contacto", d.idOpai1, personId);
      n += 1;
      continue;
    }

    if (d.motivo === "vincula_persona_correo" && d.destinoId) {
      await upsertVinculo(tx, tenantId, d.destinoId, cuentaId, d.datos);
      mapas.contacto.set(d.idOpai1, d.destinoId);
      await registrarExterno(tx, tenantId, "contacto", d.idOpai1, d.destinoId);
      n += 1;
      continue;
    }

    if (d.accion === "sin_cambios" && d.destinoId) {
      mapas.contacto.set(d.idOpai1, d.destinoId);
      await registrarExterno(tx, tenantId, "contacto", d.idOpai1, d.destinoId);
      continue;
    }

    const base = {
      nombres: d.datos.nombres,
      apellidos: d.datos.apellidos,
      email: d.datos.email,
      telefono: d.datos.telefono,
      cargo: d.datos.cargo,
      esPrincipal: d.datos.esPrincipal,
      roles: d.datos.roles,
      estado: "activo" as const,
    };

    if (d.accion === "crear") {
      const c = await tx.contacto.create({
        data: { tenantId, cuentaId, ...base },
      });
      if (d.datos.esPrincipal) await unicoPrincipal(tx, cuentaId, c.id);
      mapas.contacto.set(d.idOpai1, c.id);
      await registrarExterno(tx, tenantId, "contacto", d.idOpai1, c.id);
      n += 1;
    } else if (d.accion === "actualizar" && d.destinoId) {
      await tx.contacto.update({
        where: { id: d.destinoId },
        data: { ...base, cuentaId },
      });
      await upsertVinculo(tx, tenantId, d.destinoId, cuentaId, d.datos);
      mapas.contacto.set(d.idOpai1, d.destinoId);
      await registrarExterno(tx, tenantId, "contacto", d.idOpai1, d.destinoId);
      n += 1;
    }
  }
  return n;
}

async function aplicarInstalaciones(
  tx: TenantTx,
  tenantId: string,
  decisiones: readonly Decision<DatosInstalacion>[],
  mapas: MapasImportacion,
): Promise<number> {
  let n = 0;
  for (const d of decisiones) {
    if (d.fusionaCon !== null) {
      if (d.accion === "omitido" || d.accion === "sin_cambios") {
        const canon = mapas.instalacion.get(d.fusionaCon);
        if (canon) mapas.instalacion.set(d.idOpai1, canon);
      }
      continue;
    }
    if (!d.datos || d.accion === "conflicto" || d.accion === "omitido") continue;
    const cuentaId = resolverCuentaId(mapas, d.datos.cuentaId);
    const data = {
      nombre: d.datos.nombre,
      calle: d.datos.calle,
      comuna: d.datos.comuna,
      placeId: d.datos.placeId,
      lat: d.datos.lat,
      lng: d.datos.lng,
    };
    if (d.accion === "sin_cambios" && d.destinoId) {
      mapas.instalacion.set(d.idOpai1, d.destinoId);
      await registrarExterno(tx, tenantId, "instalacion", d.idOpai1, d.destinoId);
      continue;
    }
    if (d.accion === "crear") {
      const i = await tx.instalacion.create({ data: { tenantId, cuentaId, ...data } });
      mapas.instalacion.set(d.idOpai1, i.id);
      await registrarExterno(tx, tenantId, "instalacion", d.idOpai1, i.id);
      n += 1;
    } else if (d.accion === "actualizar" && d.destinoId) {
      await tx.instalacion.update({ where: { id: d.destinoId }, data: { ...data, cuentaId } });
      mapas.instalacion.set(d.idOpai1, d.destinoId);
      await registrarExterno(tx, tenantId, "instalacion", d.idOpai1, d.destinoId);
      n += 1;
    }
  }
  return n;
}

/** Aplica el plan completo en una transacción (lotes lógicos, una sola tx por llamada). */
export async function aplicarPlanEnTransaccion(
  tx: TenantTx,
  tenantId: string,
  plan: Plan,
): Promise<ResultadoAplicacion> {
  const mapas: MapasImportacion = {
    cuenta: new Map(),
    contacto: new Map(),
    instalacion: new Map(),
    programacion: new Map(),
  };
  const cuentas = await aplicarCuentas(tx, tenantId, plan.cuentas, mapas);
  const contactos = await aplicarContactos(tx, tenantId, plan.contactos, mapas);
  const instalaciones = await aplicarInstalaciones(tx, tenantId, plan.instalaciones, mapas);
  const programaciones = await aplicarProgramaciones(tx, tenantId, plan.programaciones, mapas);
  const omitidas =
    [...plan.cuentas, ...plan.contactos, ...plan.instalaciones, ...plan.programaciones].filter(
      (d) => d.accion === "conflicto" || (d.accion === "omitido" && !d.fusionaCon),
    ).length;
  return {
    mapas,
    aplicadas: { cuentas, contactos, instalaciones, programaciones },
    omitidas,
  };
}
