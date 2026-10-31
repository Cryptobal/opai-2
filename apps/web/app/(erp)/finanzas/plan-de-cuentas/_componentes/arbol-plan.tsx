import { AlertTriangle, Pencil } from "lucide-react";

import { Badge, Cabecera, Estado, type EstadoPantalla, SeccionTarjeta } from "@opai/ds";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";

import type { AlertaPlan, Cuenta } from "../../_componentes/tipos";
import { BotonInicializar } from "./boton-inicializar";

const SECCIONES: { tipo: Cuenta["tipo"]; titulo: string }[] = [
  { tipo: "activo", titulo: "Activo" },
  { tipo: "pasivo", titulo: "Pasivo" },
  { tipo: "patrimonio", titulo: "Patrimonio" },
  { tipo: "ingreso", titulo: "Ingresos" },
  { tipo: "costo", titulo: "Costos directos" },
  { tipo: "gasto", titulo: "Gastos" },
];

const SANGRIA = ["pl-0", "pl-4", "pl-8", "pl-12"] as const;
const GRUPO = { corriente: "Corriente", no_corriente: "No corriente" } as const;

/** Nivel de sangría de cada cuenta según su cadena de padres (el árbol llega ordenado por código). */
function profundidades(cuentas: readonly Cuenta[]) {
  const porId = new Map(cuentas.map((c) => [c.id, c]));
  const nivel = (c: Cuenta): number => {
    let n = 0;
    for (let p = c.padreId ? porId.get(c.padreId) : undefined; p; p = p.padreId ? porId.get(p.padreId) : undefined) n += 1;
    return n;
  };
  return new Map(cuentas.map((c) => [c.id, nivel(c)]));
}

function Fila({ c, nivel, alertas, gestiona }: { c: Cuenta; nivel: number; alertas: AlertaPlan[]; gestiona: boolean }) {
  const errores = alertas.filter((a) => a.cuenta === c.codigo && a.severidad === "error");
  return (
    <li className={`flex min-h-11 items-center gap-3 border-b border-border py-2 last:border-b-0 ${SANGRIA[Math.min(nivel, 3)]}`}>
      <span className="t-mono w-20 flex-none text-sm text-fg-muted">{c.codigo}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={c.aceptaAsientos ? "" : "font-semibold"}>
          {c.nombre}
          {c.activa ? "" : " (inactiva)"}
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          {c.grupo ? <Badge>{GRUPO[c.grupo]}</Badge> : null}
          <Badge>{c.naturaleza === "deudora" ? "Deudora" : "Acreedora"}</Badge>
          {c.exigeCentroCosto ? <Badge tono="info">Exige centro de costo</Badge> : null}
          {errores.length ? (
            <Badge tono="danger">
              <AlertTriangle className="size-3" aria-hidden /> Grupo incorrecto
            </Badge>
          ) : null}
        </span>
        {errores.map((e) => (
          <span key={e.codigo + e.mensaje} className="text-xs text-danger-fg">{e.mensaje}</span>
        ))}
      </span>
      {gestiona ? (
        <EnlaceBotonHoja href={`?editar=${c.id}`} variante="ghost" icono={Pencil} etiqueta={`Editar ${c.nombre}`}>
          <span className="sr-only">Editar</span>
        </EnlaceBotonHoja>
      ) : null}
    </li>
  );
}

/** Plan de cuentas (06): árbol por tipo, con grupo, naturaleza y las alertas de validación. */
export function ArbolPlan(p: {
  state: EstadoPantalla;
  cuentas: Cuenta[];
  alertas: AlertaPlan[];
  inicializado: boolean;
  gestiona: boolean;
}) {
  const nivel = profundidades(p.cuentas);
  const vacio = p.state === "ready" && !p.inicializado ? "empty" : p.state;
  return (
    <div>
      <Cabecera titulo="Plan de cuentas" />
      <Estado
        state={vacio}
        variante="lista"
        textos={{
          vacio: {
            titulo: "Aún no hay plan de cuentas",
            descripcion: "Carga la plantilla chilena base y edítala a tu medida.",
            ...(p.gestiona ? { accion: <BotonInicializar /> } : {}),
          },
        }}
      >
        <div className="flex flex-col gap-4">
          {SECCIONES.map(({ tipo, titulo }) => {
            const filas = p.cuentas.filter((c) => c.tipo === tipo);
            if (!filas.length) return null;
            return (
              <SeccionTarjeta key={tipo} titulo={titulo}>
                <ul>
                  {filas.map((c) => (
                    <Fila key={c.id} c={c} nivel={nivel.get(c.id) ?? 0} alertas={p.alertas} gestiona={p.gestiona} />
                  ))}
                </ul>
              </SeccionTarjeta>
            );
          })}
        </div>
      </Estado>
    </div>
  );
}
