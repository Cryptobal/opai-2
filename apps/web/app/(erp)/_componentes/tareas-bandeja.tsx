import { grupoDeTarea, textoVencimiento } from "@opai/domain";
import { Alerta, Badge, Enlace, SeccionTarjeta } from "@opai/ds";

import { type ActividadVista, type ListaActividades, RUTA_ENTIDAD } from "@/app/_components/actividad/tipos";
import { LinkNext } from "@/app/_components/link-next";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { ejecutarComoUsuario } from "@/lib/servidor";

const MAX = 10;

/** Ficha de la tarea: el negocio si lo hay (pasos de seguimiento), si no la primera ligada. */
function fichaDe(t: ActividadVista) {
  const v = t.vinculosDetalle.find((x) => x.tipo === "negocio") ?? t.vinculosDetalle[0];
  return v ? { href: `${RUTA_ENTIDAD[v.tipo]}/${v.id}`, nombre: v.nombre } : null;
}

/**
 * «Tareas asignadas» en la Bandeja (NAVEGACION §2; CAR-160): las tareas propias vencidas y de hoy,
 * incluidas las de los pasos de seguimiento, con la misma lectura de Mis tareas (no hay otra cola).
 * Solo servidor: se marcan hechas o se posponen en Mis tareas o en la ficha, para no sumar JS a la
 * Bandeja (ADR-037). Sin tareas o sin permiso, no aparece.
 */
export async function TareasBandeja() {
  const r = await ejecutarComoUsuario<ListaActividades>("erp", "core.actividades.tareas", { limite: 50 });
  if (!r.ok)
    // Como en Inicio: solo un fallo real se dice; sin permiso o módulo apagado, el bloque no aparece.
    return r.error.code === "INTERNAL" || r.error.code === "INVALID_OUTPUT" ? (
      <Alerta tono="danger" titulo="No pudimos cargar tus tareas asignadas" />
    ) : null;
  const ahora = new Date();
  const tareas = r.data.items
    .filter((t) => ["vencidas", "hoy"].includes(grupoDeTarea(t.vencimiento, ahora)))
    .slice(0, MAX);
  if (!tareas.length) return null;
  return (
    <SeccionTarjeta
      titulo={`Tareas asignadas · ${tareas.length}`}
      accion={
        <EnlaceBoton href="/tareas" variante="ghost">
          Ver todas
        </EnlaceBoton>
      }
    >
      <ul className="flex flex-col divide-y divide-border">
        {tareas.map((t) => {
          const v = textoVencimiento(t.vencimiento, t.todoElDia, ahora);
          const ficha = fichaDe(t);
          return (
            <li key={t.id} className="flex min-h-11 flex-wrap items-center justify-between gap-2 py-2">
              <span className="flex min-w-0 flex-col">
                <span className="t-body truncate text-fg">{t.titulo}</span>
                {ficha ? (
                  <Enlace Link={LinkNext} href={ficha.href} className="t-caption">
                    {ficha.nombre}
                  </Enlace>
                ) : null}
              </span>
              <Badge tono={v.tono}>{v.texto}</Badge>
            </li>
          );
        })}
      </ul>
    </SeccionTarjeta>
  );
}
