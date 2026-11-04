import { textoHace, textoVencimiento, ultimoContactoReal } from "@opai/domain";
import { Enlace, SeccionTarjeta } from "@opai/ds";

import type { ListaActividades } from "@/app/_components/actividad/tipos";
import { LinkNext } from "@/app/_components/link-next";
import { fecha } from "@/lib/fechas";
import { ejecutarComoUsuario } from "@/lib/servidor";

const TIPOS_CONTACTO = ["llamada", "reunion", "correo", "whatsapp", "visita"];

/** «Próxima tarea» y «Último contacto real» del Resumen del negocio (CAR-162, segundo PR). */
export async function TarjetasActividad({ negocioId }: { negocioId: string }) {
  const [tareas, contactos] = await Promise.all([
    ejecutarComoUsuario<ListaActividades>("erp", "core.actividades.tareas", {
      entidad: { tipo: "negocio", id: negocioId },
      limite: 50,
    }),
    ejecutarComoUsuario<ListaActividades>("erp", "core.actividades.timeline", {
      entidadTipo: "negocio",
      entidadId: negocioId,
      tipos: TIPOS_CONTACTO,
      limite: 30,
    }),
  ]);
  if (!tareas.ok && !contactos.ok) return null;
  const ahora = new Date();
  // La más próxima primero; las sin fecha, al final.
  const proxima = tareas.ok
    ? [...tareas.data.items].sort((a, b) =>
        (a.vencimiento ?? "9999").localeCompare(b.vencimiento ?? "9999"),
      )[0]
    : undefined;
  const ultimo = contactos.ok ? ultimoContactoReal(contactos.data.items, ahora) : null;
  const plazo = proxima ? textoVencimiento(proxima.vencimiento, proxima.todoElDia, ahora) : null;
  const href = `/negocios/${negocioId}/actividad`;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SeccionTarjeta titulo="Próxima tarea">
        {proxima && plazo ? (
          <div className="flex flex-col gap-1">
            <Enlace Link={LinkNext} href={href}>
              {proxima.titulo}
            </Enlace>
            <p className={plazo.tono === "danger" ? "t-caption text-danger-fg" : "t-caption"}>
              {plazo.texto}
              {proxima.responsablesDetalle[0] ? ` · ${proxima.responsablesDetalle[0].nombre}` : ""}
            </p>
          </div>
        ) : (
          <p className="t-caption">Sin tareas abiertas. Agrégala desde la pestaña Actividad.</p>
        )}
      </SeccionTarjeta>
      <SeccionTarjeta titulo="Último contacto real">
        {ultimo ? (
          <div className="flex flex-col gap-1">
            <p>{ultimo.titulo}</p>
            <p className="t-caption">
              {textoHace(ultimo.ocurrioEn, ahora)} · {fecha(ultimo.ocurrioEn)}
            </p>
          </div>
        ) : (
          <p className="t-caption">
            Aún no hay una llamada contestada, reunión o correo con el cliente.
          </p>
        )}
      </SeccionTarjeta>
    </div>
  );
}
