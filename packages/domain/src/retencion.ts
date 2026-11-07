// Política de retención (Ley 21.719, Brief 07d §4.5, PR 3 bloque 9). Lógica pura: sin Next, React
// ni base de datos. El catálogo asigna a cada tabla del inventario una regla; los PERIODOS son una
// PROPUESTA de Claude (§16.4) que Carlos confirma con el abogado: cada regla nace marcada como
// propuesta y el tenant la ajusta en Configuración. Un periodo 0 significa «sin vencimiento por
// política». Los hechos regulados (ADR-023) no vencen: ganan a la política.

import type { CategoriaDato } from "./datos-personales";

/** Qué hace el trabajo de retención con lo vencido. «conservar» = nunca vence por esta política. */
export const ACCIONES_RETENCION = ["anonimizar", "eliminar", "conservar"] as const;
export type AccionRetencion = (typeof ACCIONES_RETENCION)[number];

/** Fecha de referencia desde la que corre el periodo. */
export const REFERENCIAS_RETENCION = ["creacion", "fin_relacion", "archivado", "cierre"] as const;
export type ReferenciaRetencion = (typeof REFERENCIAS_RETENCION)[number];

/**
 * Quién la aplica: `trabajo` (el trabajo diario de 07d), `regulado` (hecho regulado, ADR-023: no
 * vence), `externa` (otro mecanismo ya existente: 07c, identidad, B10) o `pendiente` (queda para
 * decisión de Carlos y no se aplica todavía).
 */
export const GESTIONES_RETENCION = ["trabajo", "regulado", "externa", "pendiente"] as const;
export type GestionRetencion = (typeof GESTIONES_RETENCION)[number];

export type ReglaRetencion = {
  /** Clave estable de la regla (sufijo del ajuste `cumplimiento_retencion_<clave>_dias`). */
  clave: string;
  nombre: string; // Nombre del dato para el cliente («Contactos de clientes»).
  /** Tabla del inventario (@@map). */
  tabla: string;
  categoria: CategoriaDato;
  accion: AccionRetencion;
  desde: ReferenciaRetencion;
  /** Periodo propuesto en días corridos; 0 = sin vencimiento por política. Siempre PROPUESTA. */
  diasPropuestos: number;
  gestion: GestionRetencion;
  /** Por qué, en lenguaje claro para el cliente (lo ve en Retención y en el RAT). */
  motivo: string;
};

const DIA_MS = 86_400_000;

/**
 * Catálogo de retención propuesto, uno por tabla del inventario del Núcleo. Los valores son una
 * propuesta de Claude (26-oct-2026) que Carlos confirma con el abogado (§16.4); mientras tanto el
 * trabajo corre en simulación (ver el ajuste `cumplimiento_retencion_activa`).
 */
export const POLITICA_RETENCION: readonly ReglaRetencion[] = [
  { clave: "idempotencias", nombre: "Confirmaciones temporales", tabla: "idempotencias", categoria: "identificacion", accion: "eliminar", desde: "creacion", diasPropuestos: 1, gestion: "externa", motivo: "Copia temporal de resultados para no repetir una misma operación: dura 24 horas y se borra sola cada día." },
  { clave: "aprobaciones", nombre: "Aprobaciones de agentes", tabla: "aprobaciones", categoria: "identificacion", accion: "conservar", desde: "cierre", diasPropuestos: 0, gestion: "pendiente", motivo: "Las solicitudes sin respuesta vencen a las 72 horas. Cuánto tiempo guardar el historial de decisiones está por definir con asesoría legal." },
  { clave: "aprobaciones_plataforma", nombre: "Aprobaciones de plataforma", tabla: "aprobaciones_plataforma", categoria: "identificacion", accion: "conservar", desde: "cierre", diasPropuestos: 0, gestion: "externa", motivo: "Solicitudes de agentes sobre acciones de plataforma, fuera de las empresas: las que no se responden vencen a las 72 horas. No pertenecen a ninguna empresa, así que su plazo lo fija el equipo de plataforma, no cada empresa." },
  { clave: "gasto_agente_mes", nombre: "Gasto de agentes", tabla: "gasto_agente_mes", categoria: "economica", accion: "conservar", desde: "creacion", diasPropuestos: 0, gestion: "pendiente", motivo: "Total mensual de uso de cada agente conectado. Cuánto tiempo guardarlo está por definir con asesoría legal." },
  { clave: "personas", nombre: "Personas (trabajadores)", tabla: "personas", categoria: "identificacion", accion: "anonimizar", desde: "fin_relacion", diasPropuestos: 1825, gestion: "trabajo", motivo: "Datos que identifican al trabajador: se guardan mientras dure la relación laboral y el plazo legal de conservación (propuesta: 5 años desde el término). Después se anonimiza solo su identidad; el contrato, las remuneraciones y los demás registros laborales se mantienen completos." },
  { clave: "personas_prevision", nombre: "Previsión social del trabajador", tabla: "personas_prevision", categoria: "sensible", accion: "conservar", desde: "fin_relacion", diasPropuestos: 0, gestion: "regulado", motivo: "AFP, régimen y salud del trabajador: registro laboral que la ley obliga a conservar." },
  { clave: "personas_pago", nombre: "Cuenta bancaria del trabajador", tabla: "personas_pago", categoria: "economica", accion: "conservar", desde: "fin_relacion", diasPropuestos: 0, gestion: "regulado", motivo: "Cuenta para el pago de remuneraciones: se conserva mientras corresponda la obligación laboral y tributaria." },
  { clave: "personas_pago_solicitudes", nombre: "Solicitudes de cambio de cuenta", tabla: "personas_pago_solicitudes", categoria: "economica", accion: "conservar", desde: "cierre", diasPropuestos: 0, gestion: "pendiente", motivo: "Historial de solicitudes y decisiones de RRHH sobre la cuenta bancaria: plazo por definir con asesoría legal." },
  { clave: "personas_uniforme", nombre: "Uniforme del trabajador", tabla: "personas_uniforme", categoria: "laboral", accion: "conservar", desde: "fin_relacion", diasPropuestos: 0, gestion: "pendiente", motivo: "Tallas y notas de uniforme: plazo por definir con asesoría legal." },
  { clave: "personas_jornada_dt", nombre: "Jornada DT del trabajador", tabla: "personas_jornada_dt", categoria: "laboral", accion: "conservar", desde: "fin_relacion", diasPropuestos: 0, gestion: "regulado", motivo: "Resoluciones y jornada registrada ante la DT: registro laboral que la ley obliga a conservar." },
  { clave: "personas_os10", nombre: "Credencial OS-10", tabla: "personas_os10", categoria: "laboral", accion: "conservar", desde: "fin_relacion", diasPropuestos: 0, gestion: "regulado", motivo: "Credencial y vencimiento OS-10: registro laboral obligatorio para guardias." },
  { clave: "enrolamientos_biometricos", nombre: "Rostro enrolado de terreno", tabla: "enrolamientos_biometricos", categoria: "sensible", accion: "eliminar", desde: "creacion", diasPropuestos: 0, gestion: "externa", motivo: "Referencia cifrada del rostro para el reconocimiento facial: se borra, aquí y en el proveedor, apenas la persona revoca su consentimiento (consumidor de la revocación); no vence por plazo." },
  { clave: "credenciales_terreno", nombre: "PIN de terreno", tabla: "credenciales_terreno", categoria: "laboral", accion: "conservar", desde: "fin_relacion", diasPropuestos: 0, gestion: "pendiente", motivo: "Hash del PIN de terreno y habilitación del teléfono personal: plazo por definir con asesoría legal (propuesta: borrar al terminar la relación)." },
  { clave: "personas_contacto_laboral", nombre: "Contacto laboral ampliado", tabla: "personas_contacto_laboral", categoria: "contacto", accion: "conservar", desde: "fin_relacion", diasPropuestos: 0, gestion: "pendiente", motivo: "Contacto de emergencia y datos laborales ampliados: plazo por definir con asesoría legal." },
  { clave: "contactos", nombre: "Contactos de clientes", tabla: "contactos", categoria: "contacto", accion: "anonimizar", desde: "archivado", diasPropuestos: 730, gestion: "trabajo", motivo: "Contacto de un cliente archivado: si ya no hay relación comercial, se anonimiza a los 2 años (propuesta)." },
  { clave: "envios", nombre: "Envíos de avisos", tabla: "envios", categoria: "contacto", accion: "anonimizar", desde: "creacion", diasPropuestos: 365, gestion: "trabajo", motivo: "Registro de correos y mensajes enviados: el destinatario se anonimiza al año (propuesta) y se mantiene el registro del envío." },
  { clave: "invitaciones", nombre: "Invitaciones", tabla: "invitations", categoria: "contacto", accion: "eliminar", desde: "cierre", diasPropuestos: 90, gestion: "trabajo", motivo: "Invitación ya aceptada, vencida o revocada: no sirve como respaldo y se elimina a los 90 días (propuesta)." },
  { clave: "vinculos", nombre: "Vínculos laborales", tabla: "vinculos_laborales", categoria: "laboral", accion: "conservar", desde: "fin_relacion", diasPropuestos: 0, gestion: "regulado", motivo: "Registro laboral que la ley obliga a conservar: no se borra. Cuando se anonimiza a la persona, deja de identificarla." },
  { clave: "sueldos", nombre: "Remuneraciones", tabla: "estructuras_sueldo", categoria: "economica", accion: "conservar", desde: "creacion", diasPropuestos: 0, gestion: "regulado", motivo: "La ley obliga a conservar las remuneraciones: no se borran." },
  { clave: "cuentas", nombre: "Cuentas de clientes", tabla: "cuentas", categoria: "identificacion", accion: "conservar", desde: "creacion", diasPropuestos: 0, gestion: "pendiente", motivo: "Relación comercial y tributaria con el cliente. El plazo está por definir con asesoría legal." },
  { clave: "representantes", nombre: "Representantes legales", tabla: "cuentas_representantes", categoria: "identificacion", accion: "conservar", desde: "creacion", diasPropuestos: 0, gestion: "pendiente", motivo: "Representante legal del cliente: sigue el mismo plazo que su cuenta, por definir con asesoría legal." },
  { clave: "usuarios", nombre: "Usuarios", tabla: "users", categoria: "identificacion", accion: "conservar", desde: "creacion", diasPropuestos: 0, gestion: "pendiente", motivo: "Usuarios con acceso al sistema. Su baja se define junto con la política de seguridad y el cierre de la cuenta de la empresa." },
  { clave: "sesiones", nombre: "Sesiones", tabla: "sessions", categoria: "identificacion", accion: "conservar", desde: "creacion", diasPropuestos: 0, gestion: "pendiente", motivo: "Dirección IP y dispositivo de cada inicio de sesión. Cuándo vencen y cuánto tiempo se guarda la IP se definen junto con la política de seguridad." },
  { clave: "credenciales", nombre: "Credenciales", tabla: "accounts", categoria: "credenciales", accion: "conservar", desde: "creacion", diasPropuestos: 0, gestion: "externa", motivo: "Contraseñas (guardadas de forma que nadie puede leerlas) y accesos: existen solo mientras exista el usuario." },
  { clave: "intentos_login", nombre: "Intentos de ingreso", tabla: "login_intentos", categoria: "identificacion", accion: "eliminar", desde: "creacion", diasPropuestos: 30, gestion: "externa", motivo: "Intentos de ingreso al sistema: se borran solos a los 30 días." },
  { clave: "documentos", nombre: "Documentos", tabla: "documentos", categoria: "laboral", accion: "conservar", desde: "creacion", diasPropuestos: 0, gestion: "pendiente", motivo: "Archivos adjuntos (contratos, certificados, cédulas). Algunos deben conservarse por ley; el plazo de cada tipo de documento está por definir." },
  { clave: "perfil_empresa", nombre: "Datos de la empresa", tabla: "perfil_empresa", categoria: "contacto", accion: "conservar", desde: "creacion", diasPropuestos: 0, gestion: "externa", motivo: "Datos de la empresa y de su delegado de protección de datos: se eliminan al cerrar la cuenta de la empresa." },
  { clave: "dpa", nombre: "Aceptaciones del acuerdo de datos", tabla: "dpa_aceptaciones", categoria: "identificacion", accion: "conservar", desde: "creacion", diasPropuestos: 0, gestion: "regulado", motivo: "Constancia de que la empresa aceptó el acuerdo de tratamiento de datos: no se modifica ni se borra." },
  { clave: "auditoria", nombre: "Auditoría", tabla: "audit_events", categoria: "identificacion", accion: "conservar", desde: "creacion", diasPropuestos: 0, gestion: "regulado", motivo: "Registro de quién hizo qué y cuándo: no se modifica ni se borra." },
  { clave: "auditoria_global", nombre: "Auditoría de plataforma", tabla: "auditoria_global", categoria: "identificacion", accion: "conservar", desde: "creacion", diasPropuestos: 0, gestion: "regulado", motivo: "Registro de lo que hace el equipo de plataforma (y, más adelante, de los accesos a la cuenta): no se modifica ni se borra." },
  { clave: "consentimientos", nombre: "Consentimientos", tabla: "consentimientos", categoria: "identificacion", accion: "conservar", desde: "creacion", diasPropuestos: 0, gestion: "regulado", motivo: "Constancia de cada consentimiento y de su retiro: no se modifica ni se borra." },
  { clave: "solicitudes", nombre: "Solicitudes de titulares", tabla: "solicitudes_arco", categoria: "identificacion", accion: "conservar", desde: "creacion", diasPropuestos: 0, gestion: "regulado", motivo: "Constancia de que cada solicitud de un titular se atendió dentro de plazo: no se borra." },
  { clave: "retencion_registro", nombre: "Registro de retención", tabla: "retencion_ejecuciones", categoria: "identificacion", accion: "conservar", desde: "creacion", diasPropuestos: 0, gestion: "regulado", motivo: "Constancia de lo que hizo la política de retención, sin datos personales: no se modifica ni se borra." },
  { clave: "incidentes", nombre: "Incidentes", tabla: "incidentes", categoria: "contacto", accion: "conservar", desde: "creacion", diasPropuestos: 0, gestion: "regulado", motivo: "Registro de incidentes de seguridad y de sus avisos: no se modifica ni se borra." },
];

export const reglaDe = (tabla: string): ReglaRetencion | undefined =>
  POLITICA_RETENCION.find((r) => r.tabla === tabla);

/**
 * Reglas pendientes de decisión legal (CAR-39): su plazo es configurable por el tenant pero parte en 0
 * (apagada) y el trabajo diario no las aplica. Claude no fija sus plazos ni su acción: los decide
 * Carlos con el abogado; recién entonces cada una pasa a «trabajo» con su mecanismo.
 */
export const reglasPendientes = (): ReglaRetencion[] =>
  POLITICA_RETENCION.filter((r) => r.gestion === "pendiente");

/** Reglas que el trabajo diario aplica (las demás son informativas). */
export const reglasDelTrabajo = (): ReglaRetencion[] =>
  POLITICA_RETENCION.filter((r) => r.gestion === "trabajo");

export type EstadoRetencion = "vigente" | "vencido" | "sin_vencimiento" | "conservar_por_ley";

/**
 * Evalúa un dato frente a su regla. `dias` <= 0 → sin vencimiento. Un hecho regulado o una regla
 * que no actúa nunca vence. `conservarHasta` (obligación legal que corre aparte, p. ej. un hecho
 * regulado ligado al dato) gana a la política mientras no haya pasado. Sin fecha de referencia (el
 * dato aún está vivo: vínculo vigente, contacto sin archivar) tampoco vence.
 */
export function evaluarRetencion(
  regla: Pick<ReglaRetencion, "accion" | "gestion">,
  datos: { referencia: Date | null; dias: number; ahora: Date; conservarHasta?: Date | null },
): EstadoRetencion {
  if (regla.gestion === "regulado" || regla.accion === "conservar") return "sin_vencimiento";
  if (datos.dias <= 0 || datos.referencia === null) return "sin_vencimiento";
  const vence = new Date(datos.referencia.getTime() + Math.floor(datos.dias) * DIA_MS);
  if (datos.ahora < vence) return "vigente";
  if (datos.conservarHasta && datos.ahora < datos.conservarHasta) return "conservar_por_ley";
  return "vencido";
}

/** Fecha límite: lo anterior a ella está vencido. Se usa para filtrar en la consulta. */
export function fechaCorte(ahora: Date, dias: number): Date | null {
  if (dias <= 0) return null;
  return new Date(ahora.getTime() - Math.floor(dias) * DIA_MS);
}

/** Texto legible de la regla para el RAT («anonimizar a los 365 días de la creación»). */
export function describirRegla(regla: ReglaRetencion, dias: number): string {
  if (regla.gestion === "regulado") return `Se conserva, no se borra. ${regla.motivo}`;
  if (regla.gestion === "pendiente")
    return dias > 0
      ? `Plazo por definir (registrado: ${dias} días; todavía no se aplica). ${regla.motivo}`
      : `Plazo por definir (sin aplicar). ${regla.motivo}`;
  if (regla.gestion === "externa") return `Se gestiona por separado. ${regla.motivo}`;
  if (dias <= 0) return `Sin vencimiento configurado. ${regla.motivo}`;
  const desde = {
    creacion: "de la creación",
    fin_relacion: "del término de la relación",
    archivado: "de archivarlo",
    cierre: "de su cierre",
  }[regla.desde];
  return `${regla.accion === "eliminar" ? "Eliminar" : "Anonimizar"} a los ${dias} días ${desde} (plazo propuesto, a confirmar). ${regla.motivo}`;
}

export type Elegibilidad =
  | { ok: true }
  | { ok: false; motivo: "vinculo_vigente" | "politica_sin_definir" | "en_conservacion"; hasta?: Date };

/**
 * ¿Se puede anonimizar la identidad de una persona? Solo si no tiene relación laboral viva y, de
 * haber tenido vínculos, ya pasó el periodo de conservación (`dias`) desde el último término: la
 * obligación legal de conservar gana a cualquier solicitud (ADR-023, §10). Sin días configurados no
 * se puede probar que venció, así que no procede. Una persona sin vínculos nunca tuvo esa obligación.
 */
export function elegibilidadPersona(
  vinculos: readonly { estado: string; termino: Date | null }[],
  dias: number,
  ahora: Date,
): Elegibilidad {
  if (vinculos.length === 0) return { ok: true };
  if (vinculos.some((v) => v.estado === "vigente" || v.termino === null))
    return { ok: false, motivo: "vinculo_vigente" };
  if (dias <= 0) return { ok: false, motivo: "politica_sin_definir" };
  const fin = new Date(Math.max(...vinculos.map((v) => (v.termino as Date).getTime())));
  const estado = evaluarRetencion(
    { accion: "anonimizar", gestion: "trabajo" },
    { referencia: fin, dias, ahora },
  );
  if (estado === "vencido") return { ok: true };
  return { ok: false, motivo: "en_conservacion", hasta: new Date(fin.getTime() + Math.floor(dias) * DIA_MS) };
}
