/**
 * Lado de la app nativa (CAR-516, Brief 17b), en el navegador de la vista web. Usa los plugins que
 * Capacitor inyecta en `window.Capacitor` (Browser y App), sin agregar paquetes al JS de la web.
 */
type PluginBrowser = { open(o: { url: string }): Promise<void>; close(): Promise<void> };
type PluginApp = {
  addListener(evento: "appUrlOpen", f: (e: { url: string }) => void): Promise<{ remove(): void }>;
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

/** Abre Google en el navegador del sistema con un reto PKCE nuevo; devuelve false si no hay plugin. */
export async function iniciarGoogleEnApp(): Promise<boolean> {
  const browser = plugins()?.Browser;
  if (!browser) return false;
  const verificador = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verificador));
  localStorage.setItem(CLAVE, verificador);
  const reto = base64url(new Uint8Array(hash));
  await browser.open({ url: `${location.origin}/app/google?reto=${reto}` });
  return true;
}

/** Entrega el verificador guardado y lo borra: sirve para un solo canje. */
export function tomarVerificador(): string | null {
  const v = localStorage.getItem(CLAVE);
  localStorage.removeItem(CLAVE);
  return v;
}

/** Al volver de Google por `cl.opai.app://canje`, lleva la vista web a `/app/canje` con `navegar`. */
export function escucharVueltaApp(navegar: (ruta: string) => void): () => void {
  const p = plugins();
  const ir = (url: string | undefined) => {
    if (!url?.startsWith(ESQUEMA)) return;
    const codigo = new URL(url).searchParams.get("codigo") ?? "";
    void p?.Browser?.close().catch(() => undefined);
    navegar(`/app/canje?codigo=${encodeURIComponent(codigo)}`);
  };
  void p?.App?.getLaunchUrl().then((r) => ir(r?.url));
  const suscripcion = p?.App?.addListener("appUrlOpen", (e) => ir(e.url));
  return () => void suscripcion?.then((s) => s.remove());
}
