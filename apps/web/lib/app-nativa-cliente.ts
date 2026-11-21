/**
 * Lado de la app nativa (CAR-516, Brief 17b), en el navegador de la vista web. Usa los plugins que
 * Capacitor inyecta en `window.Capacitor` (Browser y App), sin agregar paquetes al JS de la web.
 */
type PluginBrowser = { open(o: { url: string }): Promise<void>; close(): Promise<void> };
type PluginApp = {
  addListener(
    evento: "appUrlOpen",
    f: (e: { url: string }) => void,
  ): Promise<{ remove(): void | Promise<void> }>;
  getLaunchUrl(): Promise<{ url: string } | undefined>;
};
type Capacitor = { Plugins?: { Browser?: PluginBrowser; App?: PluginApp } };

const CLAVE = "opai_app_verificador";
const ESQUEMA = "cl.opai.app://canje";

const plugins = () => (window as Window & { Capacitor?: Capacitor }).Capacitor?.Plugins;

const base64url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

/** Las APIs opcionales de algunos puentes nativos pueden lanzar o rechazar. */
async function intentar<T>(fn: () => T | Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch {
    return undefined;
  }
}

/** Abre Google con un reto PKCE nuevo. Si el puente no puede abrirlo, permite volver a intentar. */
export async function iniciarGoogleEnApp(): Promise<boolean> {
  let verificador: string | undefined;
  const abrio = await intentar(async () => {
    const browser = plugins()?.Browser;
    if (!browser) return false;
    verificador = base64url(crypto.getRandomValues(new Uint8Array(32)));
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verificador));
    localStorage.setItem(CLAVE, verificador);
    const reto = base64url(new Uint8Array(hash));
    await browser.open({ url: `${location.origin}/app/google?reto=${reto}` });
    return true;
  });
  if (!abrio && verificador) {
    // Solo borra la credencial de este intento fallido, no la de un ingreso posterior.
    await intentar(() => {
      if (localStorage.getItem(CLAVE) === verificador) localStorage.removeItem(CLAVE);
    });
  }
  return abrio === true;
}

/** Entrega el verificador guardado y lo borra: sirve para un solo canje. */
export function tomarVerificador(): string | null {
  const v = localStorage.getItem(CLAVE);
  localStorage.removeItem(CLAVE);
  return v;
}

/** Al volver de Google por `cl.opai.app://canje`, lleva la vista web a `/app/canje` con `navegar`. */
export function escucharVueltaApp(navegar: (ruta: string) => void): () => void {
  let activo = true;
  const ir = (url: string | undefined) => {
    if (!activo || !url?.startsWith(ESQUEMA)) return;
    const vuelta = new URL(url);
    if (vuelta.protocol !== "cl.opai.app:" || vuelta.host !== "canje" || vuelta.pathname !== "")
      return;
    if (vuelta.username || vuelta.password) return;
    const codigo = vuelta.searchParams.get("codigo") ?? "";
    void intentar(() => plugins()?.Browser?.close());
    navegar(`/app/canje?codigo=${encodeURIComponent(codigo)}`);
  };
  void intentar(async () => {
    const inicio = await plugins()?.App?.getLaunchUrl();
    ir(inicio?.url);
  });
  const suscripcion = intentar(() =>
    plugins()?.App?.addListener("appUrlOpen", (e) => void intentar(() => ir(e.url))),
  );
  return () => {
    activo = false;
    void intentar(async () => (await suscripcion)?.remove());
  };
}
