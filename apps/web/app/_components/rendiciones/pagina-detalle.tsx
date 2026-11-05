import { Badge, Cabecera, SeccionTarjeta } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { fechaCorta } from "@/lib/formato";

import { BotonAnular } from "./boton-anular";
import { cargarOpciones, cargarRendicion } from "./datos";
import { diaIso, kmTexto, pesos, revisaDe } from "./formato";
import {
  BASE,
  centroDe,
  ETIQUETA_ESTADO,
  ETIQUETA_TIPO,
  type PortalRendicion,
  TONO_ESTADO,
} from "./tipos";

/** Ficha de una rendición propia: estado, motivo de la devolución, gastos o viaje, y las acciones que permite su estado. */
export function PaginaDetalle({
  portal,
  params,
}: {
  portal: PortalRendicion;
  params: Promise<{ id: string }>;
}) {
  const base = BASE[portal];
  return (
    <PaginaPortal
      portal={portal}
      titulo="Rendición"
      ruta={base}
      cargando="detalle"
      volver={{ href: base, etiqueta: "Mis rendiciones" }}
      cargar={async () => {
        const { id } = await params;
        return { r: await cargarRendicion(portal, id), o: await cargarOpciones(portal) };
      }}
    >
      {({ r, o }) => {
        const editable = r.estado === "borrador" || r.estado === "devuelta";
        return (
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
            <Cabecera
              titulo={r.codigoVisible}
              subtitulo={r.descripcion}
              tituloSiempre
              sobre={<Badge tono={TONO_ESTADO[r.estado]}>{ETIQUETA_ESTADO[r.estado]}</Badge>}
            />
            {r.motivoDecision && (r.estado === "devuelta" || r.estado === "rechazada") ? (
              <p
                role="note"
                className="rounded-md bg-warning-muted px-3 py-2 text-base text-warning-fg"
              >
                <span className="font-semibold">
                  {r.estado === "devuelta" ? "Te la devolvieron: " : "La rechazaron: "}
                </span>
                {r.motivoDecision}
              </p>
            ) : null}
            <SeccionTarjeta titulo="Resumen">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-base">
                <dt className="text-fg-muted">Total</dt>
                <dd className="text-right font-medium tabular-nums">{pesos(r.montoTotal)}</dd>
                <dt className="text-fg-muted">Tipo</dt>
                <dd className="text-right">{ETIQUETA_TIPO[r.tipo] ?? r.tipo}</dd>
                <dt className="text-fg-muted">Centro de costo</dt>
                <dd className="text-right">{centroDe(r, o)}</dd>
                <dt className="text-fg-muted">Quién revisa</dt>
                <dd className="text-right">{revisaDe(r).replace("Revisa: ", "")}</dd>
                <dt className="text-fg-muted">{r.enviadaEn ? "Enviada" : "Creada"}</dt>
                <dd className="text-right">{fechaCorta(r.enviadaEn ?? r.creadaEn)}</dd>
              </dl>
            </SeccionTarjeta>
            {r.viaje ? (
              <SeccionTarjeta titulo="Viaje">
                <p className="text-base">
                  {r.viaje.origen} → {r.viaje.destino}
                </p>
                <p className="t-caption mt-1">
                  {kmTexto(r.viaje.km)} km{r.viaje.idaYVuelta ? " (ida y vuelta)" : ""} · peaje{" "}
                  {pesos(r.viaje.peajeClp)} ·{" "}
                  {r.viaje.origenDistancia === "google" ? "por ruta" : "en línea recta"}
                </p>
              </SeccionTarjeta>
            ) : (
              <SeccionTarjeta titulo={`Gastos (${r.items.length})`} sinRelleno>
                <ul>
                  {r.items.map((i) => (
                    <li
                      key={i.id}
                      className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <p className="t-label text-fg">
                          {i.tipoDocumento === "factura" ? "Factura" : "Boleta"} {i.folio ?? ""} ·{" "}
                          {i.proveedor}
                        </p>
                        <p className="truncate text-base text-fg-muted">
                          {i.descripcion} · {diaIso(i.fecha)}
                        </p>
                      </div>
                      <span className="shrink-0 tabular-nums">{pesos(i.monto)}</span>
                    </li>
                  ))}
                </ul>
              </SeccionTarjeta>
            )}
            {editable || r.estado === "enviada" ? (
              <div className="flex flex-col gap-2 md:flex-row md:justify-end">
                {r.estado !== "enviada" ? (
                  <BotonAnular portal={portal} id={r.id} codigo={r.codigoVisible} />
                ) : null}
                {editable ? (
                  <EnlaceBoton href={`${base}/${r.id}/corregir`}>
                    {r.estado === "devuelta" ? "Corregir y reenviar" : "Editar y enviar"}
                  </EnlaceBoton>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      }}
    </PaginaPortal>
  );
}
