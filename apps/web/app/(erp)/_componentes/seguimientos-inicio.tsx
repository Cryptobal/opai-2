import { Badge, SeccionTarjeta } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

import { esFalloReal, FalloBloque } from "./fallo-bloque";

type Fila = {
  id: string;
  negocioId: string;
  negocioTitulo: string;
  estadoVisible: string;
  pasos: { id: string; titulo: string; estado: string }[];
  proximoPasoId: string | null;
};

const MAXIMO = 4;

/**
 * «Seguimientos por hacer» en Inicio (CAR-67, PR 2): los pasos que esperan al usuario. Con atrasos o
 * fallos lo dice; sin pendientes o sin permiso de Comercial, no aparece.
 */
export async function SeguimientosInicio() {
  const identidad = await identidadActual();
  if (!identidad) return null;
  const r = await ejecutarComoUsuario<Fila[]>("erp", "comercial.seguimientos.list", {
    soloPendientes: true,
    estado: "activo",
    asignadoId: identidad.usuario.id,
  });
  if (!r.ok)
    return esFalloReal(r.error.code) ? (
      <FalloBloque titulo="No pudimos cargar tus seguimientos" />
    ) : null;
  if (r.data.length === 0) return null;
  const atrasados = r.data.filter(
    (s) => s.estadoVisible === "con_atrasos" || s.estadoVisible === "con_fallos",
  ).length;
  return (
    <SeccionTarjeta
      titulo={`Seguimientos por hacer (${r.data.length})`}
      accion={
        <EnlaceBoton href="/negocios/seguimiento" variante="ghost">
          Ver pendientes
        </EnlaceBoton>
      }
      sinRelleno
    >
      {atrasados ? (
        <p className="t-caption px-4 pt-3">
          {atrasados}{" "}
          {atrasados === 1
            ? "negocio con un paso atrasado o con fallo"
            : "negocios con pasos atrasados o con fallo"}
          .
        </p>
      ) : null}
      <ul className="divide-y divide-border">
        {r.data.slice(0, MAXIMO).map((s) => {
          const paso = s.pasos.find((p) => p.id === s.proximoPasoId);
          const urgente = s.estadoVisible === "con_atrasos" || s.estadoVisible === "con_fallos";
          return (
            <li key={s.id}>
              <LinkNext
                href={`/negocios/${s.negocioId}/seguimiento`}
                className="flex min-h-11 items-center justify-between gap-3 px-4 py-3 hover:bg-fill"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{s.negocioTitulo}</span>
                  {paso ? <span className="t-caption truncate">{paso.titulo}</span> : null}
                </span>
                {urgente ? <Badge tono="danger">Atrasado</Badge> : null}
              </LinkNext>
            </li>
          );
        })}
      </ul>
    </SeccionTarjeta>
  );
}
