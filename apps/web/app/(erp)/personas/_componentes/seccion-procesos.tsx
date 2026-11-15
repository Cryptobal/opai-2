import { PERMISOS_CORE } from "@opai/domain";
import { Badge, SeccionTarjeta } from "@opai/ds";

import { AccionesEntidad, type AccionEntidad } from "@/app/_components/maestros/acciones-entidad";
import { fecha } from "@/lib/fechas";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

import { SeccionError, SeccionSinAcceso } from "./estado-seccion";

const TITULO = "Ingreso y salida";
const ACTUALIZAR = "core.procesos_persona.paso_actualizar";

type Paso = {
  id: string;
  titulo: string;
  responsableId: string | null;
  responsable: string | null;
  vence: string;
  estado: "por_hacer" | "hecho" | "omitido";
  nota: string | null;
};
type Proceso = { id: string; tipo: "ingreso" | "salida"; estado: "abierto" | "cerrado"; pasos: Paso[] };

const ESTADO = {
  por_hacer: { texto: "Por hacer", tono: "warning" },
  hecho: { texto: "Hecho", tono: "success" },
  omitido: { texto: "Omitido", tono: "neutro" },
} as const;

function acciones(p: Paso, yo: string): AccionEntidad[] {
  const a = (id: string, etiqueta: string, input: Record<string, unknown>, exito: string): AccionEntidad => ({
    id: `${id}_${p.id}`, etiqueta, capacidad: { id: ACTUALIZAR, input: { id: p.id, ...input }, exito },
  });
  if (p.estado !== "por_hacer") return [a("reabrir", "Volver a por hacer", { estado: "por_hacer" }, "Paso reabierto")];
  return [
    a("hecho", "Marcar hecho", { estado: "hecho" }, "Paso hecho"),
    ...(p.responsableId === yo ? [] : [a("asignarme", "Asignármelo", { responsableId: yo }, "Paso asignado a ti")]),
    {
      ...a("omitir", "Omitir", { estado: "omitido" }, "Paso omitido"),
      confirmar: {
        titulo: "Omitir paso",
        descripcion: `«${p.titulo}» queda omitido y su tarea se cancela.`,
        boton: "Omitir",
        motivo: true,
        motivoEtiqueta: "Por qué no aplica",
      },
    },
  ];
}

/** CAR-355: las listas de ingreso y salida de la persona, con responsable, plazo y estado de cada paso. */
export async function SeccionProcesos({ personaId }: { personaId: string }) {
  const identidad = await identidadActual();
  if (!identidad) return null;
  const puede = puedeDeIdentidad(identidad);
  if (!puede(PERMISOS_CORE.vinculosRead)) return <SeccionSinAcceso titulo={TITULO} />;
  const r = await ejecutarComoUsuario<{ procesos: Proceso[] }>("erp", "core.procesos_persona.listar", { personaId });
  if (!r.ok) return <SeccionError titulo={TITULO} que="las listas de ingreso y salida" />;
  const gestiona = puede(PERMISOS_CORE.vinculosManage);
  const procesos = r.data.procesos;
  return (
    <SeccionTarjeta titulo={TITULO}>
      {procesos.length ? null : (
        <p className="t-caption">
          Sin listas de ingreso o salida. Se abren solas al crear o terminar un vínculo, con los pasos que se
          configuran en Configuración › Personas.
        </p>
      )}
      <div className="flex flex-col gap-5">
        {procesos.map((pr) => {
          const pendientes = pr.pasos.filter((p) => p.estado === "por_hacer").length;
          return (
            <section key={pr.id} aria-label={pr.tipo === "ingreso" ? "Lista de ingreso" : "Lista de salida"}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h4 className="t-label">{pr.tipo === "ingreso" ? "Ingreso" : "Salida"}</h4>
                <Badge tono={pr.estado === "cerrado" ? "success" : "info"}>
                  {pr.estado === "cerrado" ? "Completa" : `${pendientes} por hacer`}
                </Badge>
              </div>
              <ul className="flex flex-col gap-2">
                {pr.pasos.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="t-body">{p.titulo}</p>
                      <p className="t-caption">
                        Vence {fecha(p.vence)} · {p.responsable ?? "Sin responsable"}
                        {p.nota ? ` · ${p.nota}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge tono={ESTADO[p.estado].tono}>{ESTADO[p.estado].texto}</Badge>
                      {gestiona ? (
                        <AccionesEntidad etiqueta={`Acciones de «${p.titulo}»`} acciones={acciones(p, identidad.usuario.id)} />
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </SeccionTarjeta>
  );
}
