import { Badge, cn, Table, Td, Th, Tr } from "@opai/ds";

import { pesos } from "@/lib/fechas";
import { type Concepto, GRATIFICACION, type Nivel, type SueldoEfectivo } from "@/lib/tipos-sueldo";

const NIVEL: Record<Nivel, { etiqueta: string; tono: "accent" | "info" | "neutro" }> = {
  persona: { etiqueta: "Persona", tono: "accent" },
  puesto: { etiqueta: "Puesto", tono: "info" },
  instalacion: { etiqueta: "Instalación", tono: "neutro" },
};
const ORDEN: Nivel[] = ["instalacion", "puesto", "persona"];

const texto = (v: unknown) =>
  typeof v === "number" ? pesos(v) : typeof v === "string" ? (GRATIFICACION[v] ?? v) : "—";

function Valor({ c, n, oculto }: { c: Concepto; n: Nivel; oculto: boolean }) {
  const v = c.valores[n];
  if (oculto) return <span className="text-fg-subtle">••••</span>;
  if (v === null || v === undefined) return <span className="text-fg-subtle">—</span>;
  if (c.origen === n)
    return (
      <span className="inline-flex rounded-sm border-2 border-accent px-2 py-0.5 font-semibold text-fg">
        {texto(v)}
      </span>
    );
  return <span className="text-fg-subtle line-through">{texto(v)}</span>;
}

/** Totales fijos: imponible (base y bonos imponibles) y no imponible (colación, movilización). */
function totales(s: SueldoEfectivo) {
  const bonos = Object.values(s.niveles).flatMap((e) => e?.items ?? []);
  let imponible = 0;
  let noImponible = 0;
  for (const c of s.conceptos) {
    if (typeof c.final !== "number") continue;
    const bono = c.clave.startsWith("bono:")
      ? bonos.find((b) => `bono:${b.nombre}` === c.clave)
      : null;
    if (c.clave === "colacion" || c.clave === "movilizacion" || (bono && !bono.imponible))
      noImponible += c.final;
    else imponible += c.final;
  }
  return { imponible, noImponible };
}

type Props = { s: SueldoEfectivo; columnas: Record<Nivel, { titulo: string; detalle: string }> };

/** Cómo se arma el sueldo (57): concepto por concepto, el valor de cada nivel y de dónde viene. */
export function TablaSueldo({ s, columnas }: Props) {
  const oculto = s.conceptos.some((c) => c.final === null && c.origen !== null);
  const t = totales(s);
  return (
    <Table>
      <thead>
        <tr>
          <Th>Concepto</Th>
          {ORDEN.map((n) => (
            <Th key={n}>
              <span className="flex flex-col">
                <span>{columnas[n].titulo}</span>
                <span className="font-normal">{columnas[n].detalle}</span>
              </span>
            </Th>
          ))}
          <Th className="bg-fill">Valor final</Th>
          <Th>Viene de</Th>
        </tr>
      </thead>
      <tbody>
        {s.conceptos.map((c) => (
          <Tr key={c.clave}>
            <Td>{c.nombre}</Td>
            {ORDEN.map((n) => (
              <Td key={n}>
                <Valor c={c} n={n} oculto={oculto} />
              </Td>
            ))}
            <Td className="bg-fill font-semibold">{oculto ? "••••" : texto(c.final)}</Td>
            <Td>
              {c.origen ? (
                <Badge tono={NIVEL[c.origen].tono} punto={false}>
                  {NIVEL[c.origen].etiqueta}
                </Badge>
              ) : null}
            </Td>
          </Tr>
        ))}
        <Tr>
          <Td colSpan={4} className={cn("font-semibold", "whitespace-normal")}>
            Total fijo antes de gratificación
            {oculto ? null : (
              <span className="t-caption ml-1 font-normal">
                · imponible {pesos(t.imponible)} · no imponible {pesos(t.noImponible)}
              </span>
            )}
          </Td>
          <Td className="bg-fill font-semibold">
            {oculto ? "••••" : pesos(t.imponible + t.noImponible)}
          </Td>
          <Td />
        </Tr>
      </tbody>
    </Table>
  );
}
