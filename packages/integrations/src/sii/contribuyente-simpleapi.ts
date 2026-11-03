// Proveedor SimpleAPI RUT (paridad 1.0: `src/modules/finance/shared/adapters/simpleapi-rut.ts`).
// GET https://rut.simpleapi.cl/v2/{rut} con Basic base64("api:" + key). La key viene del almacén
// cifrado del tenant; nunca se escribe en logs ni en mensajes de error.
import type {
  ActividadSii,
  ConsultaContribuyente,
  DatosContribuyente,
  ResultadoContribuyente,
} from "./contribuyente";

export const SIMPLEAPI_RUT_BASE = "https://rut.simpleapi.cl/v2" as const;
/** El SII encola consultas; sobre este tiempo se informa «sin respuesta» y se puede reintentar. */
export const TIMEOUT_CONTRIBUYENTE_MS = 20_000;

type Crudo = {
  rut?: unknown;
  razonSocial?: unknown;
  actividadesEconomicas?: unknown;
  correoIntercambio?: unknown;
  domicilios?: unknown;
  presentaInicioActividades?: unknown;
  fechaInicioActividades?: unknown;
};

const texto = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

/** dd-mm-aaaa → aaaa-mm-dd (o null). */
function fechaIso(v: unknown): string | null {
  const t = texto(v);
  const m = t?.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

export function normalizarContribuyente(rut: string, c: Crudo): ResultadoContribuyente {
  const actividades: ActividadSii[] = Array.isArray(c.actividadesEconomicas)
    ? c.actividadesEconomicas.flatMap((a: Record<string, unknown>) => {
        const codigo = texto(a?.["codigo"]);
        const descripcion = texto(a?.["descripcion"]);
        return codigo && descripcion
          ? [{ codigo, descripcion, afectaIva: a?.["afectaIVA"] === true }]
          : [];
      })
    : [];
  const dom = Array.isArray(c.domicilios) ? (c.domicilios[0] as Record<string, unknown>) : null;
  const datos: DatosContribuyente = {
    rut,
    razonSocial: texto(c.razonSocial) ?? "",
    actividades,
    direccion: texto(dom?.["direccion"]),
    comuna: texto(dom?.["comuna"]),
    ciudad: texto(dom?.["ciudad"]),
    correoIntercambio: texto(c.correoIntercambio),
    inicioActividades: fechaIso(c.fechaInicioActividades),
  };
  if (!datos.razonSocial)
    return { estado: "no_encontrado", mensaje: `No hay registros del RUT ${rut} en el SII.` };
  return c.presentaInicioActividades === false
    ? { estado: "sin_inicio", datos }
    : { estado: "ok", datos };
}

/** Lo único que el adaptador usa de `fetch` (permite dobles de prueba sin conversiones). */
export type PedirHttp = (
  url: string,
  init: { headers: Record<string, string>; signal: AbortSignal },
) => Promise<Pick<Response, "status" | "ok" | "json">>;

export function contribuyenteSimpleApi(
  apiKey: string | null,
  opts: { fetch?: PedirHttp; timeoutMs?: number } = {},
): ConsultaContribuyente {
  const pedir: PedirHttp = opts.fetch ?? ((url, init) => fetch(url, init));
  return {
    nombre: "simpleapi_rut",
    disponible: Boolean(apiKey),
    async consultar(rut) {
      if (!apiKey)
        return { estado: "no_configurado", mensaje: "Falta la API key de SimpleAPI RUT." };
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), opts.timeoutMs ?? TIMEOUT_CONTRIBUYENTE_MS);
      try {
        const res = await pedir(`${SIMPLEAPI_RUT_BASE}/${encodeURIComponent(rut)}`, {
          headers: {
            Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
            Accept: "application/json",
          },
          signal: ctl.signal,
        });
        if (res.status === 400 || res.status === 404)
          return { estado: "no_encontrado", mensaje: `No hay registros del RUT ${rut} en el SII.` };
        if (res.status === 401 || res.status === 403)
          return {
            estado: "no_configurado",
            mensaje: "SimpleAPI rechazó la API key o la cuenta no tiene el producto RUT.",
          };
        if (!res.ok)
          return {
            estado: "sin_respuesta",
            mensaje: `El SII respondió con error (HTTP ${res.status}).`,
          };
        return normalizarContribuyente(rut, (await res.json()) as Crudo);
      } catch (e) {
        const abortado = e instanceof Error && e.name === "AbortError";
        return {
          estado: "sin_respuesta",
          mensaje: abortado
            ? "El SII tardó más de 20 segundos. Tus datos no cambiaron; reintenta en unos minutos."
            : "No se pudo conectar con el SII. Reintenta en unos minutos.",
        };
      } finally {
        clearTimeout(t);
      }
    },
  };
}
