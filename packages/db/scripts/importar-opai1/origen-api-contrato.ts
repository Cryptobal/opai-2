// Contrato real del exportador de 1.0 (`opai1-export/v1`, docs/opai2-export-v1.md de Cryptobal/opai):
// recursos en español, historial anidado en cada negocio y valores `Decimal` como texto.
// Este módulo traduce esas filas a la forma que valida `origen.ts`. Funciones puras; no toca la red.
import type { DatosOpai1 } from "./origen";

/** Recurso del exportador → clave de `DatosOpai1`. `correlativos` y `folios` no se leen: el correlativo CPQ se deriva de los códigos. */
export const RECURSOS_V1 = {
  cuentas: "accounts",
  contactos: "contacts",
  instalaciones: "installations",
  etapas: "pipelineStages",
  negocios: "deals",
  actividades: "activities",
  cotizaciones: "cpqQuotes",
  recurrentes: "recurringInvoiceSchedules",
} as const satisfies Partial<Record<string, keyof DatosOpai1>>;

export type RecursoV1 = keyof typeof RECURSOS_V1;
export const NOMBRES_RECURSOS_V1 = Object.keys(RECURSOS_V1) as RecursoV1[];

export type Acumulado = Record<keyof DatosOpai1, unknown[]>;

export function acumuladoVacio(): Acumulado {
  return {
    accounts: [],
    contacts: [],
    installations: [],
    pipelineStages: [],
    deals: [],
    dealStageHistory: [],
    dealContacts: [],
    recurringInvoiceSchedules: [],
    cpqQuotes: [],
    activities: [],
    users: [],
  };
}

type Fila = Record<string, unknown>;
const esFila = (v: unknown): v is Fila => typeof v === "object" && v !== null && !Array.isArray(v);

/** `Decimal` del export ("1500000.00") a entero CLP; vacío o ilegible → null. */
function aEntero(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

const ESTADOS_NEGOCIO = new Set(["open", "won", "lost", "closed"]);

function agregarNegocio(acc: Acumulado, fila: Fila): void {
  const {
    etapa: _etapa,
    historial_etapas: historial,
    duenoId,
    duenoFuente: _fuente,
    ...resto
  } = fila;
  void _etapa;
  void _fuente;
  const id = String(fila["id"]);
  const status =
    typeof resto["status"] === "string" && ESTADOS_NEGOCIO.has(resto["status"])
      ? resto["status"]
      : null;
  acc.deals.push({
    ...resto,
    amount: aEntero(resto["amount"]),
    status,
    ownerId: typeof duenoId === "string" ? duenoId : null,
  });
  if (Array.isArray(historial)) {
    for (const h of historial.filter(esFila)) {
      acc.dealStageHistory.push({
        id: h["id"],
        dealId: id,
        fromStageId: h["fromStageId"] ?? null,
        toStageId: h["toStageId"],
        changedAt: h["changedAt"],
      });
    }
  }
  // Un negocio repetido entre páginas reemplaza el vínculo derivado anterior (solo vale la última versión).
  acc.dealContacts = acc.dealContacts.filter((v) => !(esFila(v) && v["dealId"] === id));
  const contacto = fila["primaryContactId"];
  if (typeof contacto === "string" && contacto) {
    acc.dealContacts.push({
      id: `${id}:${contacto}`,
      dealId: id,
      contactId: contacto,
      role: "primary",
    });
  }
}

function adaptarRecurrente(fila: Fila): Fila {
  const { isActive, ultimaCorridaExitosa: corrida, ...conNulos } = fila;
  // Columnas anulables en 1.0 cuyo esquema de lectura usa valor por defecto: null se lee como «ausente».
  const resto = Object.fromEntries(
    Object.entries(conNulos).filter(
      ([k, v]) => !(v === null && (k === "dayOfMonth" || k === "diasCobroDesdeFactura")),
    ),
  );
  const ranAt = esFila(corrida) ? corrida["ranAt"] : null;
  return {
    ...resto,
    active: isActive === true,
    lastSuccessfulRun: typeof ranAt === "string" ? { runAt: ranAt, period: null } : null,
  };
}

/** Agrega una fila del exportador a `acc`. Una actividad sin fecha se omite (la fila exige fecha). */
export function agregarFila(acc: Acumulado, recurso: RecursoV1, fila: unknown): void {
  if (!esFila(fila)) return;
  switch (recurso) {
    case "negocios":
      return agregarNegocio(acc, fila);
    case "recurrentes":
      acc.recurringInvoiceSchedules.push(adaptarRecurrente(fila));
      return;
    case "actividades":
      if (typeof fila["fecha"] === "string") acc.activities.push(fila);
      return;
    default:
      acc[RECURSOS_V1[recurso]].push(fila);
  }
}
