"use client";

/** El `ejecutar` de `useCapacidad`: devuelve null si la capacidad falló. */
type EjecutarCap = (
  id: string,
  input: unknown,
  dryRun?: boolean,
  revalidar?: "ninguna",
) => Promise<unknown>;

/** Cómo quedó el aviso al celular en este dispositivo después de guardar. */
export type EstadoPush = "activo" | "apagado" | "sin-soporte" | "instalar" | "denegado" | "error";

const aBytes = (b64: string) => {
  const s = atob(
    b64
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(b64.length / 4) * 4, "="),
  );
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

/** iPhone o iPad sin la app en la pantalla de inicio: ahí Safari no ofrece push (iOS 16.4+, ADR-044.4). */
// iPadOS 13+ se presenta como «Macintosh»: se reconoce por la pantalla táctil.
const esIos = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

function iosSinInstalar(): boolean {
  const ios = esIos();
  const instalada = window.matchMedia("(display-mode: standalone)").matches;
  return ios && !instalada;
}

/** Nombre corto del dispositivo, para reconocerlo después (sin datos personales). */
function nombreDispositivo(): string {
  const ua = navigator.userAgent;
  if (esIos()) return "iPhone o iPad";
  if (/Android/.test(ua)) return "Android";
  return "Computador";
}

/** El service worker listo, o null si no llega en 5 s (registro fallido o bloqueado): `ready` no resuelve nunca. */
const swListo = () =>
  Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((r) => setTimeout(() => r(null), 5000)),
  ]);

const mismaClave = (sub: PushSubscription, clave: Uint8Array) => {
  const k = sub.options.applicationServerKey;
  if (!k) return false;
  const a = new Uint8Array(k);
  return a.length === clave.length && a.every((x, i) => x === clave[i]);
};

/**
 * Pide el permiso del navegador **dentro del gesto** de guardar, antes de cualquier espera: Safari en iOS y
 * Firefox lo rechazan si se pide después de una llamada al servidor. Devuelve la promesa para `activarPush`.
 */
export function pedirPermiso(clave: string | null): Promise<NotificationPermission> | null {
  if (!clave || !("Notification" in window)) return null;
  return Notification.permission === "default"
    ? Notification.requestPermission()
    : Promise.resolve(Notification.permission);
}

/**
 * Activa el aviso al celular al guardar con algún «Aviso en el celular» encendido: el permiso se pide en ese
 * momento, nunca al abrir (ADR-044.4). Sin clave pública (push apagado en el servidor) no hace nada.
 */
export async function activarPush(
  clave: string | null,
  ejecutar: EjecutarCap,
  permisoPedido: Promise<NotificationPermission> | null,
): Promise<EstadoPush> {
  if (!clave) return "apagado";
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return iosSinInstalar() ? "instalar" : "sin-soporte";
  }
  try {
    const permiso = await (permisoPedido ?? Notification.requestPermission());
    if (permiso !== "granted") return "denegado";
    const registro = await swListo();
    if (!registro) return "error";
    const llave = aBytes(clave);
    let sub = await registro.pushManager.getSubscription();
    // Si cambió la clave VAPID, la suscripción vieja ya no sirve: se rehace con la nueva.
    if (sub && !mismaClave(sub, llave)) {
      await sub.unsubscribe();
      sub = null;
    }
    sub ??= await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: llave,
    });
    const r = await ejecutar(
      "core.push.suscribir",
      { endpoint: sub.endpoint, dispositivo: nombreDispositivo() },
      false,
      "ninguna",
    );
    return r ? "activo" : "error";
  } catch {
    return "error";
  }
}

/** Apaga el aviso en este dispositivo al guardar con todos los «Aviso en el celular» apagados. */
export async function apagarPush(ejecutar: EjecutarCap): Promise<void> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  try {
    const registro = await swListo();
    const sub = await registro?.pushManager.getSubscription();
    if (!sub) return;
    await ejecutar("core.push.quitar", { endpoint: sub.endpoint }, false, "ninguna");
    await sub.unsubscribe();
  } catch {
    // Sin service worker o sin red: queda como estaba; el servidor borra las suscripciones vencidas.
  }
}

/** Texto para la persona según cómo quedó el aviso (null = nada que decir). */
export function mensajePush(e: EstadoPush): string | null {
  switch (e) {
    case "instalar":
      return "Para recibir avisos en el iPhone, agrega OPAI a tu pantalla de inicio (Compartir › Agregar a inicio) y vuelve a guardar.";
    case "sin-soporte":
      return "Este navegador no permite avisos en el celular. Los verás igual en la campana de la app.";
    case "denegado":
      return "No diste permiso para avisos. Puedes activarlo en los ajustes del navegador y volver a guardar.";
    case "error":
      return "No pudimos activar los avisos en este celular. Los verás igual en la campana de la app.";
    default:
      return null;
  }
}
