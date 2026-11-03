import { esVertical, formatearNumero, formatearUsd, vocabulario } from "@opai/domain";
import { Badge } from "@opai/ds";

/** Estado de una empresa: activa, en prueba o suspendida (el color es estado). */
const ESTADO: Record<
  string,
  { etiqueta: string; tono: "success" | "info" | "warning" | "neutro" }
> = {
  activo: { etiqueta: "Activo", tono: "success" },
  trial: { etiqueta: "Trial", tono: "info" },
  suspendido: { etiqueta: "Suspendido", tono: "warning" },
};

export function EstadoTenant({ estado }: { estado: string }) {
  const e = ESTADO[estado] ?? { etiqueta: estado, tono: "neutro" as const };
  return <Badge tono={e.tono}>{e.etiqueta}</Badge>;
}

export const nombreVertical = (v: string) => (esVertical(v) ? vocabulario(v).vertical : v);

/** "US$ 28,00". */
export const usd = (n: number | null | undefined) =>
  n == null
    ? "—"
    : formatearUsd(n);

/** "6,8 M" / "2.296". */
export function cantidad(n: number) {
  if (n >= 1_000_000)
    return `${formatearNumero(n / 1_000_000, 1)} M`;
  return formatearNumero(n);
}

/** Insignia de la barra superior de Plataforma. */
export function Superadmin() {
  return (
    <Badge tono="accent" punto={false}>
      Superadmin
    </Badge>
  );
}
