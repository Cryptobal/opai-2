import { Alerta, Badge } from "@opai/ds";

/** Aviso cuando la cotización elegida no llena todos los marcadores de la plantilla. */
export function AlertaMarcadoresVista({
  vacios,
  sinResolver,
}: {
  vacios: readonly string[];
  sinResolver: readonly string[];
}) {
  if (vacios.length === 0 && sinResolver.length === 0) return null;
  return (
    <Alerta tono="warning" titulo="Marcadores sin dato en esta cotización">
      <ul className="mt-1 list-disc space-y-0.5 pl-4">
        {sinResolver.map((m) => (
          <li key={`r-${m}`}>
            <Badge tono="warning">{m}</Badge> sin resolver
          </li>
        ))}
        {vacios.map((m) => (
          <li key={`v-${m}`}>
            <code className="font-mono text-xs">{m}</code>
          </li>
        ))}
      </ul>
    </Alerta>
  );
}