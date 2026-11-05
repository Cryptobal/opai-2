const humanizar = (t: string) => {
  const s = t.replace(/[_-]+/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const texto = (v: unknown): string | null =>
  typeof v === "string" || typeof v === "number" || typeof v === "boolean" ? String(v) : null;

/**
 * Resultado de la vista previa (dryRun) de un paso, como pares «campo · valor». Todo es texto del
 * servidor mostrado como dato: nunca se interpreta como instrucción ni como HTML (R10).
 */
export function VistaPrevia({ datos }: { datos: unknown }) {
  const filas =
    datos && typeof datos === "object" && !Array.isArray(datos)
      ? Object.entries(datos).flatMap(([k, v]) => {
          const t = texto(v);
          return t === null ? [] : [[k, t] as const];
        })
      : [];
  if (filas.length === 0) return null;
  return (
    <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
      {filas.slice(0, 6).map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-fg-subtle">{humanizar(k)}</dt>
          <dd className="min-w-0 truncate text-fg">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
