// Plan de instalaciones (CrmInstallation → core.instalaciones). Dedupe por `place_id` o distancia
// < 50 m dentro de la misma cuenta. Sin cuenta (instalación de un lead) se omite y se reporta.
import {
  type Aviso,
  type Decision,
  decision,
  decisionDuplicado,
  decisionMapeada,
  indiceIds,
  ordenEstable,
} from "./comun";
import type { CuentaResuelta } from "./cuentas";
import type { EstadoDestino } from "./destino-tipos";
import {
  distanciaMetros,
  nombreCanonico,
  punto,
  textoLimpio,
  UMBRAL_MISMA_UBICACION_M,
} from "./normalizar";
import type { InstalacionOpai1 } from "./origen";

export type DatosInstalacion = {
  cuentaId: string;
  nombre: string;
  calle: string | null;
  comuna: string | null;
  placeId: string | null;
  lat: number | null;
  lng: number | null;
  estado: "prospecto" | "activa" | "inactiva";
};

type Ubicacion = Pick<DatosInstalacion, "placeId" | "lat" | "lng">;
type Resolver = (id: string | null | undefined) => CuentaResuelta | null | undefined;

export function mismaUbicacion(a: Ubicacion, b: Ubicacion): boolean {
  if (a.placeId && a.placeId === b.placeId) return true;
  const pa = punto(a.lat, a.lng);
  const pb = punto(b.lat, b.lng);
  return pa !== null && pb !== null && distanciaMetros(pa, pb) < UMBRAL_MISMA_UBICACION_M;
}

/** Sin información que contradiga: falta el punto en algún lado y los place_id no difieren. */
function ubicacionCompatible(a: Ubicacion, b: Ubicacion): boolean {
  const placeDistinto = a.placeId !== null && b.placeId !== null && a.placeId !== b.placeId;
  const ambosPuntos = punto(a.lat, a.lng) !== null && punto(b.lat, b.lng) !== null;
  return !placeDistinto && !ambosPuntos;
}

/** `active | inactive | prospect` de 1.0 → `activa | inactiva | prospecto`. */
export function estadoInstalacion(f: InstalacionOpai1): DatosInstalacion["estado"] {
  const s = textoLimpio(f.status)?.toLowerCase();
  if (s === "active") return "activa";
  if (s === "inactive") return "inactiva";
  return "prospecto";
}

export const EQUIVALENTES_INSTALACION = { estado: "prospecto" } as const;

export function datosInstalacion(f: InstalacionOpai1, cuentaId: string): DatosInstalacion {
  return {
    cuentaId,
    nombre: textoLimpio(f.name) ?? f.name,
    calle: textoLimpio(f.address),
    comuna: textoLimpio(f.commune),
    placeId: textoLimpio(f.placeId),
    // core.instalaciones guarda Decimal(10,7): se redondea igual para que el plan sea idempotente.
    lat: f.lat == null ? null : Math.round(f.lat * 1e7) / 1e7,
    lng: f.lng == null ? null : Math.round(f.lng * 1e7) / 1e7,
    estado: estadoInstalacion(f),
  };
}

export function planInstalaciones(
  filas: readonly InstalacionOpai1[],
  resolver: Resolver,
  destino: EstadoDestino,
): { decisiones: Decision<DatosInstalacion>[]; avisos: Aviso[] } {
  const ids = indiceIds(destino, "instalacion");
  const actuales = new Map(destino.instalaciones.map((i) => [i.id, i]));
  const canonicas = new Map<string, Decision<DatosInstalacion>[]>();
  const decisiones: Decision<DatosInstalacion>[] = [];
  const avisos: Aviso[] = [];
  const omitir = (id: string, motivo: string) =>
    decisiones.push(decision<DatosInstalacion>("instalacion", id, "omitido", { motivo }));

  for (const f of ordenEstable(filas)) {
    if (!f.accountId) {
      omitir(f.id, f.leadId ? "sin_cuenta_lead" : "sin_cuenta");
      continue;
    }
    const cuenta = resolver(f.accountId);
    if (!cuenta) {
      omitir(f.id, cuenta === null ? "cuenta_no_resuelta" : "cuenta_inexistente");
      continue;
    }
    const datos = datosInstalacion(f, cuenta.clave);
    if (!punto(datos.lat, datos.lng) && !datos.placeId)
      avisos.push({ codigo: "instalacion_sin_ubicacion", idOpai1: f.id });
    const mapeado = ids.porExterno.get(f.id);
    const previas = canonicas.get(cuenta.clave) ?? [];
    const nombre = nombreCanonico(datos.nombre);
    const duplicada = previas.find((p) => p.datos && mismaUbicacion(p.datos, datos));
    let d: Decision<DatosInstalacion>;
    if (duplicada) {
      decisiones.push(
        decisionDuplicado("instalacion", f.id, duplicada, mapeado, "duplicado_ubicacion"),
      );
      continue;
    } else if (previas.some((p) => p.datos && nombreCanonico(p.datos.nombre) === nombre))
      d = decision("instalacion", f.id, "conflicto", { motivo: "nombre_repetido_en_cuenta" });
    else if (mapeado)
      d = decisionMapeada("instalacion", f.id, datos, actuales.get(mapeado), mapeado, EQUIVALENTES_INSTALACION);
    else d = vincularOCrear(f.id, datos, cuenta, nombre, destino, ids.mapeadoAOtro);
    canonicas.set(cuenta.clave, [...previas, { ...d, datos }]);
    decisiones.push(d);
  }
  return { decisiones, avisos };
}

function vincularOCrear(
  id: string,
  datos: DatosInstalacion,
  cuenta: CuentaResuelta,
  nombre: string,
  destino: EstadoDestino,
  mapeadoAOtro: (destinoId: string, aceptados: readonly string[]) => boolean,
): Decision<DatosInstalacion> {
  const enCuenta = destino.instalaciones.filter((i) => i.cuentaId === cuenta.destinoId);
  const mismoNombre = (i: { nombre: string }) => nombreCanonico(i.nombre) === nombre;
  const porUbicacion = enCuenta.find((i) => mismaUbicacion(i, datos));
  const porNombre = enCuenta.find((i) => mismoNombre(i) && ubicacionCompatible(i, datos));
  const existente = porUbicacion ?? porNombre;
  if (!existente) {
    return enCuenta.some(mismoNombre)
      ? decision("instalacion", id, "conflicto", { motivo: "nombre_existente_en_cuenta" })
      : decision("instalacion", id, "crear", { datos });
  }
  if (mapeadoAOtro(existente.id, [id]))
    return decision("instalacion", id, "conflicto", {
      motivo: "instalacion_ya_mapeada",
      destinoId: existente.id,
    });
  return {
    ...decisionMapeada("instalacion", id, datos, existente, existente.id, EQUIVALENTES_INSTALACION),
    accion: "actualizar",
    motivo: porUbicacion ? "vincula_por_ubicacion" : "vincula_por_nombre",
  };
}
