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
import { soloCampos } from "./completar-vacios";
import { type Previos, type Registro, sinRegistro } from "./registro";

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

const fechaCol = (dia: string | null) => (dia ? new Date(`${dia}T00:00:00.000Z`) : null);

/** Columnas de `core.cuentas` de un plan (el representante va en su propia tabla). */
function cuentaPrisma(d: Partial<DatosCuenta>) {
  const { representanteNombre: _n, representanteRut: _r, escrituraFecha, clienteDesde, clienteHasta, ...resto } = d;
  return {
    ...resto,
    ...(escrituraFecha !== undefined ? { escrituraFecha: fechaCol(escrituraFecha) } : {}),
    ...(clienteDesde !== undefined ? { clienteDesde: fechaCol(clienteDesde) } : {}),
    ...(clienteHasta !== undefined ? { clienteHasta: fechaCol(clienteHasta) } : {}),
  };
}

/** Valores actuales de 2.0 de los campos que se van a completar (para revertir). */
async function previosCuenta(tx: TenantTx, id: string, campos: readonly string[]): Promise<Previos> {
  const c = await tx.cuenta.findFirst({ where: { id } });
  const actual: Record<string, unknown> = c ? { ...c } : {};
  return Object.fromEntries(
    campos.filter((k) => k in actual).map((k) => [k, actual[k] ?? null]),
  );
}

/** Crea el representante legal solo si la cuenta no tiene ninguno. Devuelve si lo creó. */
async function crearRepresentante(
  tx: TenantTx,
  tenantId: string,
  cuentaId: string,
  d: Partial<DatosCuenta>,
): Promise<boolean> {
  if (!d.representanteNombre || !d.representanteRut) return false;
  const hay = await tx.cuentaRepresentante.findFirst({ where: { cuentaId } });
  if (hay) return false;
  await tx.cuentaRepresentante.create({
    data: { tenantId, cuentaId, nombre: d.representanteNombre, rut: d.representanteRut },
  });
  return true;
}

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

/**
 * Registra el id externo y deja constancia en la corrida. Si el vínculo con 1.0 es nuevo para una
 * fila que ya existía, queda marcado para que la reversión también lo quite.
 */
async function anotar(
  tx: TenantTx,
  tenantId: string,
  reg: Registro,
  entidad: EntidadImportada,
  idOpai1: string,
  entidadId: string,
  metodo: "creado" | "completado" | "sinCambio",
  previos: Previos = {},
): Promise<void> {
  const hab = await tx.idExterno.findFirst({
    where: { sistema: SISTEMA_OPAI1, entidadTipo: entidad, idExterno: idOpai1 },
    select: { id: true },
  });
  await registrarExterno(tx, tenantId, entidad, idOpai1, entidadId);
  if (metodo === "creado") return reg.creado(entidad, idOpai1, entidadId);
  const nuevo = hab === null ? { _vinculoNuevo: true } : {};
  if (metodo === "completado" || hab === null)
    return reg.completado(entidad, idOpai1, entidadId, { ...previos, ...nuevo });
  return reg.sinCambio(entidad, idOpai1, entidadId);
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
    // Solo completa: un cargo o rol vacío en 1.0 nunca borra lo que ya tiene 2.0.
    const completa = {
      ...(datos.cargo && !existente.cargo ? { cargo: datos.cargo } : {}),
      ...(datos.roles.length > 0 && existente.roles.length === 0 ? { roles: datos.roles } : {}),
      ...(datos.esPrincipal && !existente.esPrincipal ? { esPrincipal: true } : {}),
    };
    if (Object.keys(completa).length > 0)
      await tx.contactoCuenta.update({ where: { id: existente.id }, data: completa });
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
/** Columna `DATE` (AAAA-MM-DD) como medianoche UTC. */
const fechaDia = (dia: string | null) => (dia ? new Date(`${dia}T00:00:00.000Z`) : null);

async function aplicarProgramaciones(
  tx: TenantTx,
  tenantId: string,
  decisiones: readonly Decision<DatosProgramacion>[],
  mapas: MapasImportacion,
  reg: Registro,
): Promise<number> {
  let n = 0;
  for (const d of decisiones) {
    if (d.accion === "sin_cambios" && d.destinoId) {
      mapas.programacion.set(d.idOpai1, d.destinoId);
      await anotar(tx, tenantId, reg, "programacion_recurrente", d.idOpai1, d.destinoId, "sinCambio");
      continue;
    }
    if (!d.datos || d.accion !== "crear") continue;
    const cuentaId = d.datos.cuentaId ? resolverCuentaId(mapas, d.datos.cuentaId) : null;
    const instalacionId = d.datos.instalacionId
      ? resolverInstalacionId(mapas, d.datos.instalacionId)
      : null;
    if (d.datos.instalacionId && !instalacionId) {
      throw new Error(`Instalación no resuelta para programación ${d.idOpai1}`);
    }
    const dp = d.datos;
    const p = await tx.ventasProgramacion.create({
      data: {
        tenantId,
        cuentaId,
        instalacionId,
        nombre: dp.nombre,
        activa: dp.activa,
        tipoDte: dp.tipoDte,
        frecuencia: dp.frecuencia,
        diaGeneracion: dp.diaGeneracion,
        diaSemana: dp.diaSemana,
        mesDelAnio: dp.mesDelAnio,
        moneda: dp.moneda,
        plazoPagoDias: dp.plazoPagoDias,
        facturaTiming: dp.facturaTiming,
        facturaDia: dp.facturaDia,
        facturaMesRelativo: dp.facturaMesRelativo,
        modoPeriodoFacturado: dp.modoPeriodoFacturado,
        politicaTextoPeriodo: dp.politicaTextoPeriodo,
        montoVariable: dp.montoVariable,
        autoEnvioProforma: dp.autoEnvioProforma,
        autoEnvioEstadoPago: dp.autoEnvioEstadoPago,
        envioAutomatico: dp.envioAutomatico,
        notas: dp.notas,
        referenciasAdicionales: dp.referenciasAdicionales as object,
        fechaInicio: fechaDia(dp.fechaInicio),
        fechaFin: fechaDia(dp.fechaFin),
        politicaUf: dp.politicaUf,
        diaUf: dp.diaUf,
        ajusteIpcMeses: dp.ajusteIpcMeses,
        ajusteIpcDesde: fechaDia(dp.ajusteIpcDesde),
        receptorRut: dp.receptor.rut,
        receptorRazonSocial: dp.receptor.razonSocial,
        receptorGiro: dp.receptor.giro,
        receptorDireccion: dp.receptor.direccion,
        receptorComuna: dp.receptor.comuna,
        receptorCiudad: dp.receptor.ciudad,
        ultimoPeriodo10: dp.ultimoPeriodo10,
        // Importada pausada: nunca se copia `nextRunAt` de 1.0.
        proximaEjecucionEn: null,
        ultimaEjecucionEn: fechaOp(dp.ultimaEjecucionEn),
      },
    });
    for (const [orden, l] of dp.lineas.entries()) {
      await tx.ventasProgramacionLinea.create({
        data: {
          tenantId,
          programacionId: p.id,
          orden,
          glosa: l.glosa,
          cantidad: l.cantidad,
          unidad: l.unidad,
          precioUnitarioClp: l.precioUnitarioClp === null ? null : BigInt(l.precioUnitarioClp),
          precioUnitarioUf: l.precioUnitarioUf === null ? null : BigInt(l.precioUnitarioUf),
          descuentoPct: l.descuentoPct,
          exento: l.exento,
        },
      });
    }
    for (const [orden, c] of dp.destinatariosCorreo.entries()) {
      await tx.ventasProgramacionDestinatario.create({
        data: { tenantId, programacionId: p.id, correo: c.correo, tipo: c.tipo, orden },
      });
    }
    const contactosVistos = new Set<string>();
    for (const [orden, cidOpai1] of dp.destinatariosContactoOpai1Ids.entries()) {
      const contactoId = mapas.contacto.get(cidOpai1);
      if (!contactoId || contactosVistos.has(contactoId)) continue;
      contactosVistos.add(contactoId);
      await tx.ventasProgramacionDestinatario.create({
        data: { tenantId, programacionId: p.id, contactoId, orden: orden + dp.destinatariosCorreo.length },
      });
    }
    mapas.programacion.set(d.idOpai1, p.id);
    await anotar(tx, tenantId, reg, "programacion_recurrente", d.idOpai1, p.id, "creado");
    n += 1;
  }
  return n;
}

async function aplicarCuentas(
  tx: TenantTx,
  tenantId: string,
  decisiones: readonly Decision<DatosCuenta>[],
  mapas: MapasImportacion,
  reg: Registro,
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
      await anotar(tx, tenantId, reg, "cuenta", d.idOpai1, d.destinoId, "sinCambio");
      continue;
    }
    if (d.accion === "crear") {
      const c = await tx.cuenta.create({ data: { tenantId, ...cuentaPrisma(d.datos), nombre: d.datos.nombre } });
      await crearRepresentante(tx, tenantId, c.id, d.datos);
      mapas.cuenta.set(d.idOpai1, c.id);
      await anotar(tx, tenantId, reg, "cuenta", d.idOpai1, c.id, "creado");
      n += 1;
    } else if (d.accion === "actualizar" && d.destinoId) {
      // Solo completa vacíos: escribe únicamente los campos del plan, nunca nulos.
      const previos = await previosCuenta(tx, d.destinoId, d.campos);
      const parcial = soloCampos(d.datos, d.campos);
      await tx.cuenta.update({ where: { id: d.destinoId }, data: cuentaPrisma(parcial) });
      const repCreado = await crearRepresentante(tx, tenantId, d.destinoId, { ...d.datos, ...parcial });
      if (repCreado) previos["_representanteCreado"] = true;
      mapas.cuenta.set(d.idOpai1, d.destinoId);
      await anotar(tx, tenantId, reg, "cuenta", d.idOpai1, d.destinoId, "completado", previos);
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
  reg: Registro,
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
      await anotar(tx, tenantId, reg, "contacto", d.idOpai1, personId, "sinCambio");
      n += 1;
      continue;
    }

    if (d.motivo === "vincula_persona_correo" && d.destinoId) {
      await upsertVinculo(tx, tenantId, d.destinoId, cuentaId, d.datos);
      mapas.contacto.set(d.idOpai1, d.destinoId);
      await anotar(tx, tenantId, reg, "contacto", d.idOpai1, d.destinoId, "sinCambio");
      n += 1;
      continue;
    }

    if (d.accion === "sin_cambios" && d.destinoId) {
      mapas.contacto.set(d.idOpai1, d.destinoId);
      await anotar(tx, tenantId, reg, "contacto", d.idOpai1, d.destinoId, "sinCambio");
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
      await anotar(tx, tenantId, reg, "contacto", d.idOpai1, c.id, "creado");
      n += 1;
    } else if (d.accion === "actualizar" && d.destinoId) {
      // Solo completa vacíos; no cambia la cuenta de la persona ni escribe nulos.
      const parcial = soloCampos(base, d.campos);
      const actual = await tx.contacto.findFirst({ where: { id: d.destinoId } });
      const previos: Previos = Object.fromEntries(
        Object.keys(parcial).map((k) => [k, (actual as Record<string, unknown> | null)?.[k] ?? null]),
      );
      if (Object.keys(parcial).length > 0)
        await tx.contacto.update({ where: { id: d.destinoId }, data: parcial });
      await upsertVinculo(tx, tenantId, d.destinoId, cuentaId, d.datos);
      mapas.contacto.set(d.idOpai1, d.destinoId);
      await anotar(tx, tenantId, reg, "contacto", d.idOpai1, d.destinoId, "completado", previos);
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
  reg: Registro,
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
    const { cuentaId: _c, ...data } = d.datos;
    if (d.accion === "sin_cambios" && d.destinoId) {
      mapas.instalacion.set(d.idOpai1, d.destinoId);
      await anotar(tx, tenantId, reg, "instalacion", d.idOpai1, d.destinoId, "sinCambio");
      continue;
    }
    if (d.accion === "crear") {
      const i = await tx.instalacion.create({ data: { tenantId, cuentaId, ...data } });
      mapas.instalacion.set(d.idOpai1, i.id);
      await anotar(tx, tenantId, reg, "instalacion", d.idOpai1, i.id, "creado");
      n += 1;
    } else if (d.accion === "actualizar" && d.destinoId) {
      const parcial = soloCampos(data, d.campos);
      const actual = await tx.instalacion.findFirst({ where: { id: d.destinoId } });
      const previos: Previos = Object.fromEntries(
        Object.keys(parcial).map((k) => [k, (actual as Record<string, unknown> | null)?.[k] ?? null]),
      );
      if (Object.keys(parcial).length > 0)
        await tx.instalacion.update({ where: { id: d.destinoId }, data: parcial });
      mapas.instalacion.set(d.idOpai1, d.destinoId);
      await anotar(tx, tenantId, reg, "instalacion", d.idOpai1, d.destinoId, "completado", previos);
      n += 1;
    }
  }
  return n;
}

export function mapasVacios(): MapasImportacion {
  return { cuenta: new Map(), contacto: new Map(), instalacion: new Map(), programacion: new Map() };
}

/**
 * Aplica el plan en una transacción. `mapas` y `reg` permiten encadenar lotes: los mapas persisten
 * entre transacciones y `reg` deja constancia de cada fila en la corrida.
 */
export async function aplicarPlanEnTransaccion(
  tx: TenantTx,
  tenantId: string,
  plan: Plan,
  reg: Registro = sinRegistro,
  mapas: MapasImportacion = mapasVacios(),
): Promise<ResultadoAplicacion> {
  const cuentas = await aplicarCuentas(tx, tenantId, plan.cuentas, mapas, reg);
  const contactos = await aplicarContactos(tx, tenantId, plan.contactos, mapas, reg);
  const instalaciones = await aplicarInstalaciones(tx, tenantId, plan.instalaciones, mapas, reg);
  const programaciones = await aplicarProgramaciones(tx, tenantId, plan.programaciones, mapas, reg);
  const sinEntrar = [
    ...plan.cuentas,
    ...plan.contactos,
    ...plan.instalaciones,
    ...plan.programaciones,
  ].filter((d) => d.accion === "conflicto" || (d.accion === "omitido" && !d.fusionaCon));
  for (const d of sinEntrar) await reg.omitido(d.entidad, d.idOpai1, d.motivo ?? d.accion);
  const omitidas = sinEntrar.length;
  return {
    mapas,
    aplicadas: { cuentas, contactos, instalaciones, programaciones },
    omitidas,
  };
}
