import { Badge, DetailScreen, SeccionTarjeta } from "@opai/ds";

import { type AccionEntidad, AccionesEntidad } from "@/app/_components/maestros/acciones-entidad";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import type { cargarActivo } from "./datos-activos";
import { HojaActivo } from "./diferidas";
import { type Entrega, estadoActivo, type FichaActivo } from "./tipos";

const fecha = (iso: string) => iso.split("-").reverse().join("-");
const dia = (iso: string) =>
  new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "America/Santiago" }).format(new Date(iso));

function acciones(a: FichaActivo): AccionEntidad[] {
  if (a.estado === "de_baja") return [];
  const cambiar = (estado: string, exito: string) => ({
    id: "inventario.activos.cambiar_estado",
    input: { id: a.id, estado },
    exito,
  });
  const lista: AccionEntidad[] = [{ id: "editar", etiqueta: "Editar", parametro: { clave: "editar", valor: "1" } }];
  if (a.estado === "disponible")
    lista.push({ id: "reparar", etiqueta: "Enviar a reparación", capacidad: cambiar("en_reparacion", "Enviado a reparación") });
  if (a.estado === "en_reparacion")
    lista.push({ id: "disponible", etiqueta: "Marcar disponible", capacidad: cambiar("disponible", "Activo disponible") });
  if (a.estado !== "asignado")
    lista.push({
      id: "baja",
      etiqueta: "Dar de baja",
      peligro: true,
      capacidad: cambiar("de_baja", "Activo dado de baja"),
      confirmar: {
        titulo: `¿Dar de baja ${a.codigo}?`,
        descripcion: "No se puede deshacer. El activo deja de ofrecerse y queda en el historial con su motivo.",
        boton: "Dar de baja",
        peligro: true,
        motivo: true,
        motivoEtiqueta: "Motivo",
        motivoPlaceholder: "Por ejemplo: perdido en turno, dañado sin reparación",
      },
    });
  return lista;
}

function LoTiene({ entrega, puedeGestionar }: { entrega: Entrega; puedeGestionar: boolean }) {
  return (
    <SeccionTarjeta titulo="Lo tiene">
      <p>
        <span className="font-medium">{entrega.destino}</span>
        <span className="text-fg-muted"> · desde el {dia(entrega.entregadaEn)}</span>
      </p>
      {puedeGestionar ? (
        <EnlaceBoton href={`/inventario/entregas?devolver=${entrega.id}`} variante="secondary" className="mt-3">
          Registrar devolución
        </EnlaceBoton>
      ) : null}
    </SeccionTarjeta>
  );
}

/** Panel derecho de un activo (CAR-236): datos, campos propios del tipo y estado. */
export async function DetalleActivo({
  datos,
  puedeGestionar,
}: {
  datos: ReturnType<typeof cargarActivo>;
  puedeGestionar: boolean;
}) {
  const { state, activo: a, entrega } = await datos;
  const estado = a ? estadoActivo(a.estado) : null;
  return (
    <DetailScreen
      state={a ? state : state === "ready" ? "error" : state}
      titulo={a?.codigo ?? "Activo"}
      {...(a && estado
        ? {
            estado: <Badge tono={estado.tono}>{estado.etiqueta}</Badge>,
            subtitulo: a.numeroSerie ? `${a.tipo} · Serie ${a.numeroSerie}` : a.tipo,
            acciones: (
              <AccionesEntidad etiqueta="Acciones del activo" acciones={puedeGestionar ? acciones(a) : []} />
            ),
          }
        : {})}
    >
      {a ? (
        <div className="flex flex-col gap-4">
          {entrega ? <LoTiene entrega={entrega} puedeGestionar={puedeGestionar} /> : null}
          {a.motivoBaja ? (
            <SeccionTarjeta titulo="Dado de baja">
              <p>{a.motivoBaja}</p>
            </SeccionTarjeta>
          ) : null}
          <SeccionTarjeta titulo="Datos">
            <dl className="flex flex-col divide-y divide-border">
              {a.campos.map((c) => {
                const v = a.valores[c.clave];
                const texto = v === undefined ? "—" : c.tipo === "fecha" ? fecha(String(v)) : String(v);
                return (
                  <div key={c.clave} className="flex items-center justify-between gap-3 py-2.5">
                    <dt className="text-fg-muted">{c.etiqueta}</dt>
                    <dd className="font-medium">{texto}</dd>
                  </div>
                );
              })}
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-fg-muted">Notas</dt>
                <dd className="font-medium">{a.notas ?? "—"}</dd>
              </div>
            </dl>
          </SeccionTarjeta>
          {puedeGestionar && a.estado !== "de_baja" ? <HojaActivo key={a.id} activo={a} /> : null}
        </div>
      ) : null}
    </DetailScreen>
  );
}
