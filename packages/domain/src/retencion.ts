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
  /** Tabla del inventario (@@map). */
  tabla: string;
  categoria: CategoriaDato;
  accion: AccionRetencion;
  desde: ReferenciaRetencion;
  /** Periodo propuesto en días corridos; 0 = sin vencimiento por política. Siempre PROPUESTA. */
  diasPropuestos: number;
  gestion: GestionRetencion;
  /** Por qué, en lenguaje de negocio (va al RAT y al PR). */
  motivo: string;
};

const DIA_MS = 86_400_000;

/**
 * Catálogo de retención propuesto, uno por tabla del inventario del Núcleo. Los valores son una
 * propuesta de Claude (26-oct-2026) que Carlos confirma con el abogado (§16.4); mientras tanto el
 * trabajo corre en simulación (ver el ajuste `cumplimiento_retencion_activa`).
 */
export const POLITICA_RETENCION: readonly ReglaRetencion[] = [
  { clave: "personas", tabla: "personas", categoria: "identificacion", accion: "anonimizar", desde: "fin_relacion", diasPropuestos: 1825, gestion: "trabajo", motivo: "Identidad del trabajador: se conserva mientras dure el vínculo y el plazo de conservación laboral (propuesta 5 años desde el término; el abogado confirma). Se anonimiza solo la identidad: el vínculo, la remuneración y demás hechos regulados quedan íntegros." },
  { clave: "contactos", tabla: "contactos", categoria: "contacto", accion: "anonimizar", desde: "archivado", diasPropuestos: 730, gestion: "trabajo", motivo: "Contacto de una cuenta cliente archivado: sin relación comercial viva, se anonimiza tras 2 años (propuesta)." },
  { clave: "envios", tabla: "envios", categoria: "contacto", accion: "anonimizar", desde: "creacion", diasPropuestos: 365, gestion: "trabajo", motivo: "Bitácora de envíos: el destinatario (correo o teléfono) sobra una vez pasado el periodo de soporte (propuesta 1 año); se conserva el hecho del envío." },
  { clave: "invitaciones", tabla: "invitations", categoria: "contacto", accion: "eliminar", desde: "cierre", diasPropuestos: 90, gestion: "trabajo", motivo: "Invitación ya aceptada, vencida o revocada: transitoria, sin valor probatorio; se elimina a los 90 días del cierre (propuesta)." },
  { clave: "vinculos", tabla: "vinculos_laborales", categoria: "laboral", accion: "conservar", desde: "fin_relacion", diasPropuestos: 0, gestion: "regulado", motivo: "Hecho laboral regulado (ADR-023): no se borra. Al anonimizar a la persona deja de ser identificable." },
  { clave: "sueldos", tabla: "estructuras_sueldo", categoria: "economica", accion: "conservar", desde: "creacion", diasPropuestos: 0, gestion: "regulado", motivo: "Remuneración: obligación legal de conservar (ADR-023); no se borra." },
  { clave: "cuentas", tabla: "cuentas", categoria: "identificacion", accion: "conservar", desde: "creacion", diasPropuestos: 0, gestion: "pendiente", motivo: "Relación comercial y tributaria con el cliente: el plazo lo fija Carlos con el abogado." },
  { clave: "representantes", tabla: "cuentas_representantes", categoria: "identificacion", accion: "conservar", desde: "creacion", diasPropuestos: 0, gestion: "pendiente", motivo: "Representante legal del cliente: sigue la suerte de la cuenta; el plazo lo fija Carlos con el abogado." },
  { clave: "usuarios", tabla: "users", categoria: "identificacion", accion: "conservar", desde: "creacion", diasPropuestos: 0, gestion: "pendiente", motivo: "Usuario del sistema, tabla global sin tenant: su baja se define con la política de seguridad (B5) y el borrado del tenant (B10)." },
  { clave: "sesiones", tabla: "sessions", categoria: "identificacion", accion: "conservar", desde: "creacion", diasPropuestos: 0, gestion: "pendiente", motivo: "IP y agente de las sesiones, tabla global sin tenant: la expiración y la retención de la IP se coordinan con B5." },
  { clave: "credenciales", tabla: "accounts", categoria: "credenciales", accion: "conservar", desde: "creacion", diasPropuestos: 0, gestion: "externa", motivo: "Contraseña con hash y tokens: viven y mueren con la cuenta del usuario (identidad)." },
  { clave: "intentos_login", tabla: "login_intentos", categoria: "identificacion", accion: "eliminar", desde: "creacion", diasPropuestos: 30, gestion: "externa", motivo: "Intentos de acceso (07c, B1): los purga a diario `core.purgar_login_intentos` a los 30 días; este brief no la duplica ni la baja de 30." },
  { clave: "documentos", tabla: "documentos", categoria: "laboral", accion: "conservar", desde: "creacion", diasPropuestos: 0, gestion: "pendiente", motivo: "Archivos en R2 (contratos, certificados, cédulas): algunos son hechos regulados; la política por tipo de documento la decide Carlos." },
  { clave: "perfil_empresa", tabla: "perfil_empresa", categoria: "contacto", accion: "conservar", desde: "creacion", diasPropuestos: 0, gestion: "externa", motivo: "Datos de la empresa y su DPO: se eliminan con el borrado del tenant (B10)." },
  { clave: "dpa", tabla: "dpa_aceptaciones", categoria: "identificacion", accion: "conservar", desde: "creacion", diasPropuestos: 0, gestion: "regulado", motivo: "Prueba de aceptación del DPA: append-only, no se borra." },
  { clave: "auditoria", tabla: "audit_events", categoria: "identificacion", accion: "conservar", desde: "creacion", diasPropuestos: 0, gestion: "regulado", motivo: "Auditoría append-only: no se borra." },
  { clave: "consentimientos", tabla: "consentimientos", categoria: "identificacion", accion: "conservar", desde: "creacion", diasPropuestos: 0, gestion: "regulado", motivo: "Prueba del consentimiento y de su revocación: append-only, no se borra." },
  { clave: "solicitudes", tabla: "solicitudes_arco", categoria: "identificacion", accion: "conservar", desde: "creacion", diasPropuestos: 0, gestion: "regulado", motivo: "Prueba de la atención al titular dentro de plazo: no se borra." },
  { clave: "retencion_registro", tabla: "retencion_ejecuciones", categoria: "identificacion", accion: "conservar", desde: "creacion", diasPropuestos: 0, gestion: "regulado", motivo: "Prueba de lo que hizo la política de retención: append-only, sin datos personales en claro; no se borra." },
  { clave: "incidentes", tabla: "incidentes", categoria: "contacto", accion: "conservar", desde: "creacion", diasPropuestos: 0, gestion: "regulado", motivo: "Registro de incidentes y avisos de brecha: append-only, no se borra." },
];

export const reglaDe = (tabla: string): ReglaRetencion | undefined =>
  POLITICA_RETENCION.find((r) => r.tabla === tabla);

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
  if (regla.gestion === "regulado") return `Se conserva (hecho regulado, ADR-023): ${regla.motivo}`;
  if (regla.gestion === "pendiente") return `Pendiente de decisión: ${regla.motivo}`;
  if (regla.gestion === "externa") return `Gestión externa: ${regla.motivo}`;
  if (dias <= 0) return `Sin vencimiento configurado: ${regla.motivo}`;
  const desde = {
    creacion: "de la creación",
    fin_relacion: "del término de la relación",
    archivado: "de archivarlo",
    cierre: "de su cierre",
  }[regla.desde];
  return `${regla.accion === "eliminar" ? "Eliminar" : "Anonimizar"} a los ${dias} días ${desde} (propuesta a confirmar): ${regla.motivo}`;
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
