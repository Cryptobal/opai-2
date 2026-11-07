import { Badge, Cabecera, Estado, SeccionTarjeta, Table, Td, Th, Tr } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { fechaCorta } from "@/lib/formato";
import { identidadActual } from "@/lib/servidor";
import { puedeDeIdentidad } from "@/lib/permisos-ui";

import { pesos } from "../formato";
import { AccionesLote } from "./acciones-lote";
import { ArmarLote } from "./armar-lote";
import { SelectorCuentaOrigen } from "./cuenta-origen";
import { cargarCandidatas, cargarCuentasOrigen, cargarLote, cargarLotes } from "./datos";
import { ETIQUETA_LOTE, type PermisosLote, RUTA_LOTES, TONO_LOTE } from "./tipos";

async function permisosDe(): Promise<PermisosLote> {
  const i = await identidadActual();
  const puede = i ? puedeDeIdentidad(i) : () => false;
  return { pagar: puede("rendiciones:pagar"), aprobar: puede("rendiciones:pagar.aprobar"), configurar: puede("rendiciones:config.manage"), yoId: i?.usuario.id ?? "" };
}

/** «Lotes de pago»: aprobadas listas para pagar (arriba, solo quien paga) y los lotes de la empresa. */
export function PaginaLotes() {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Lotes de pago"
      ruta={RUTA_LOTES}
      cargar={async () => {
        const permisos = await permisosDe();
        const [candidatas, lotes, origen] = await Promise.all([cargarCandidatas(permisos.pagar), cargarLotes(), cargarCuentasOrigen(permisos.configurar)]);
        return { candidatas, lotes, permisos, origen };
      }}
    >
      {({ candidatas, lotes, permisos, origen }) => (
        <div className="flex flex-col gap-4">
          <Cabecera titulo="Lotes de pago" subtitulo="Agrupa rendiciones aprobadas, genera la nómina y marca el pago." />
          {permisos.configurar ? (
            <SeccionTarjeta titulo="Nómina Santander">
              <SelectorCuentaOrigen cuentas={origen.cuentas} seleccionadaId={origen.seleccionadaId} />
            </SeccionTarjeta>
          ) : null}
          {permisos.pagar ? (
            <SeccionTarjeta titulo="Aprobadas listas para pagar">
              <Estado state={candidatas.length === 0 ? "empty" : "ready"} variante="lista" textos={{ vacio: { titulo: "No hay rendiciones aprobadas por pagar", descripcion: "Cuando se aprueben, aparecerán aquí para armar un lote." } }}>
                <ArmarLote candidatas={candidatas} />
              </Estado>
            </SeccionTarjeta>
          ) : null}
          <SeccionTarjeta titulo="Lotes" sinRelleno>
            <Estado state={lotes.length === 0 ? "empty" : "ready"} variante="lista" textos={{ vacio: { titulo: "Aún no hay lotes de pago", descripcion: "Crea el primero con las rendiciones aprobadas." } }}>
              <Table>
                <thead><tr><Th>Lote</Th><Th>Estado</Th><Th className="text-right">Rendiciones</Th><Th className="text-right">Total</Th><Th>Creado</Th></tr></thead>
                <tbody>
                  {lotes.map((l) => (
                    <Tr key={l.id}>
                      <Td><LinkNext href={`${RUTA_LOTES}/${l.id}`} className="font-medium text-fg hover:underline">{l.codigoVisible}</LinkNext></Td>
                      <Td><Badge tono={TONO_LOTE[l.estado]}>{ETIQUETA_LOTE[l.estado]}</Badge></Td>
                      <Td className="text-right tabular-nums">{l.cantidad}</Td>
                      <Td className="text-right tabular-nums">{pesos(l.totalClp)}</Td>
                      <Td>{fechaCorta(l.creadoEn)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </Estado>
          </SeccionTarjeta>
        </div>
      )}
    </PaginaPortal>
  );
}

export function PaginaLote({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Lote de pago"
      ruta={RUTA_LOTES}
      cargando="detalle"
      volver={{ href: RUTA_LOTES, etiqueta: "Lotes de pago" }}
      cargar={async () => {
        const { id } = await params;
        return { lote: await cargarLote(id), permisos: await permisosDe() };
      }}
    >
      {({ lote, permisos }) => (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          <Cabecera titulo={lote.codigoVisible} tituloSiempre sobre={<Badge tono={TONO_LOTE[lote.estado]}>{ETIQUETA_LOTE[lote.estado]}</Badge>} subtitulo={`${lote.cantidad} rendiciones · ${pesos(lote.totalClp)}`} />
          {lote.estado === "pagado" ? (
            <p role="note" className="rounded-md bg-success-muted px-3 py-2 text-base text-success-fg">Pagado el {lote.fechaPago ? fechaCorta(lote.fechaPago) : "—"} · referencia «{lote.referenciaPago}». Las rendiciones pasaron a Pagada.</p>
          ) : null}
          <SeccionTarjeta titulo="Rendiciones del lote" sinRelleno>
            <ul>
              {lote.items.map((i) => (
                <li key={i.rendicionId} className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0">
                  <div className="min-w-0"><p className="t-label text-fg">{i.codigoVisible} · {i.personaNombre ?? "Persona"}</p><p className="truncate text-base text-fg-muted">{i.descripcion}</p></div>
                  <span className="tabular-nums">{pesos(i.montoClp)}</span>
                </li>
              ))}
            </ul>
          </SeccionTarjeta>
          <SeccionTarjeta titulo="Historial">
            <ul className="flex flex-col gap-1 text-base">
              {lote.historial.map((h) => (<li key={`${h.tipo}-${h.creadoEn}`}><b>{h.tipo}</b> <span className="text-fg-muted">· {fechaCorta(h.creadoEn)}{h.comentario ? ` · ${h.comentario}` : ""}</span></li>))}
            </ul>
          </SeccionTarjeta>
          <AccionesLote lote={lote} permisos={permisos} />
        </div>
      )}
    </PaginaPortal>
  );
}
