import { cn } from "../cn";
import { Badge } from "./badge";

export type CapaSueldoVista = "persona" | "puesto" | "instalacion";
export const ETIQUETA_CAPA = {
  persona: "Sueldo por RUT",
  puesto: "Puesto",
  instalacion: "Instalación",
};
export function BadgeCapa({ capa }: { capa: CapaSueldoVista }) {
  return <Badge punto={false}>{ETIQUETA_CAPA[capa]}</Badge>;
}
export function OrigenMonto({ capa, version }: { capa: CapaSueldoVista; version: string }) {
  return (
    <span className="t-caption">
      {ETIQUETA_CAPA[capa]} · versión {version.split("-").reverse().join("-")}
    </span>
  );
}
export function PilaCapas({
  capa,
  capas,
}: {
  capa: CapaSueldoVista | null;
  capas: Record<CapaSueldoVista, { vigenteDesde: string } | null>;
}) {
  return (
    <ol className="overflow-hidden rounded-lg border border-border" aria-label="Capas de sueldo">
      {(["persona", "puesto", "instalacion"] as const).map((n) => (
        <li
          key={n}
          className={cn(
            "flex flex-wrap items-center justify-between gap-2 border-l-2 px-4 py-3",
            capa === n ? "border-accent bg-fill" : "border-transparent",
          )}
        >
          <span className="t-label">{ETIQUETA_CAPA[n]}</span>
          {capa === n ? (
            <Badge tono="accent">Rige</Badge>
          ) : (
            <span className="t-caption">
              {capas[n] ? "No se usa: hay una capa más específica" : "No definida"}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

export type EstructuraSueldoVista = {
  sueldoBase: number | null;
  colacion: number | null;
  movilizacion: number | null;
  gratificacion: string | null;
  gratificacionMonto: number | null;
  sensible: boolean;
  items: readonly {
    nombre: string;
    tipo: string;
    monto: number | null;
    porcentaje: number | null;
    imponible: boolean;
  }[];
};
const pesos = (n: number | null) =>
  n === null
    ? "Sin definir"
    : new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0,
      }).format(n);
export function TablaEstructura({
  estructura: e,
  origen,
}: {
  estructura: EstructuraSueldoVista;
  origen?: { capa: CapaSueldoVista; version: string };
}) {
  const monto = (n: number | null) => (e.sensible ? "••••" : pesos(n));
  const filas = [
    ["Sueldo base", monto(e.sueldoBase)],
    ["Colación", monto(e.colacion)],
    ["Movilización", monto(e.movilizacion)],
    [
      "Gratificación",
      e.sensible
        ? "••••"
        : e.gratificacion === "monto_fijo"
          ? pesos(e.gratificacionMonto)
          : e.gratificacion === "legal_25"
            ? "Legal 25 % con tope"
            : e.gratificacion === "ninguna"
              ? "Ninguna"
              : "Sin definir",
    ],
    ...e.items.map((i) => [
      i.nombre,
      e.sensible
        ? "••••"
        : `${i.tipo === "bono_fijo" ? pesos(i.monto) : i.porcentaje === null ? "Sin definir" : `${i.porcentaje / 10000} %`} · ${i.imponible ? "Imponible" : "No imponible"}`,
    ]),
  ];
  return (
    <dl className="divide-y divide-border">
      {filas.map(([nombre, valor], i) => (
        <div key={i} className="flex flex-wrap justify-between gap-2 py-3">
          <dt className="t-label">{nombre}</dt>
          <dd className="flex flex-col items-end gap-1">
            <span className="t-numeric">{valor}</span>
            {origen ? <OrigenMonto {...origen} /> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
