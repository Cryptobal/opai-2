// Precalienta, antes de cada corrida (y de cada shard de CI), las rutas que el proxy consulta con un
// tope de 4 s: en `next dev` la primera visita compila la ruta y, si `/api/existe` tarda más que eso,
// el proxy deja decidir a la página y una ficha fuera de alcance muestra su aviso en línea en vez del
// 404 del portal (navegacion-permisos, CAR-60). Sin sesión responde rápido; solo importa compilar.
export default async function calentar() {
  const base = process.env["BASE_URL"] ?? "http://localhost:3000";
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)[:/]/.test(base)) return;
  for (const ruta of [
    "/api/existe?ruta=%2Fpersonas%2F00000000-0000-7000-8000-000000000000",
    "/api/health",
  ]) {
    await fetch(`${base}${ruta}`, { signal: AbortSignal.timeout(120_000) }).catch(() => undefined);
  }
}
