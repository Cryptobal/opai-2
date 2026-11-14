import { Plus, SlidersHorizontal } from "lucide-react";

import { Badge, DetailScreen, SeccionTarjeta, Table, Td, Th, Tr } from "@opai/ds";
import { formatearFechaHora } from "@opai/domain";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { conteo } from "@/lib/plural";

import type { cargarPrenda } from "./datos-ropa";
import { HojaAjusteRopa, HojaIngresoRopa } from "./diferidas";
import type { MovimientoRopa } from "./tipos";


function Movimientos({ items }: { items: MovimientoRopa[] }) {
  if (items.length === 0) return <p className="t-caption">Aún no hay movimientos.</p>;
  return (
    <ul className="flex flex-col divide-y divide-border">
      {items.map((m) => (
        <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
          <span className="flex min-w-0 flex-col">
            <span className="font-medium">
              {m.motivoEtiqueta} · talla {m.talla}
            </span>
            <span className="t-caption truncate">{m.nota ? `${formatearFechaHora(m.fecha)} · ${m.nota}` : formatearFechaHora(m.fecha)}</span>
          </span>
          <Badge tono={m.delta > 0 ? "success" : "warning"}>{m.delta > 0 ? `+${m.delta}` : m.delta}</Badge>
        </li>
      ))}
    </ul>
  );
}

/** Panel derecho de un tipo de ropa (CAR-237): existencias por talla, ingreso, ajuste e historial. */
export async function DetalleRopa({ datos, puedeGestionar }: { datos: ReturnType<typeof cargarPrenda>; puedeGestionar: boolean }) {
  const { state, tipo, prenda, movimientos } = await datos;
  const existencias = prenda?.existencias ?? tipo?.tallas.map((talla) => ({ talla, cantidad: 0 })) ?? [];
  return (
    <DetailScreen
      state={tipo ? state : state === "ready" ? "error" : state}
      titulo={tipo?.nombre ?? "Ropa"}
      {...(tipo
        ? {
            subtitulo: conteo(prenda?.total ?? 0, "unidad disponible", "unidades disponibles"),
            acciones:
              puedeGestionar && tipo.activo ? (
                <EnlaceBotonHoja href="?ingreso=1" icono={Plus}>
                  Registrar ingreso
                </EnlaceBotonHoja>
              ) : undefined,
          }
        : {})}
    >
      {tipo ? (
        <div className="flex flex-col gap-4">
          <SeccionTarjeta titulo="Existencias">
            <Table etiqueta="Existencias por talla">
              <thead>
                <Tr>
                  <Th>Talla</Th>
                  <Th className="text-right">Unidades</Th>
                  {puedeGestionar ? <Th className="sr-only">Acciones</Th> : null}
                </Tr>
              </thead>
              <tbody>
                {existencias.map((e) => (
                  <Tr key={e.talla}>
                    <Td className="font-medium">{e.talla}</Td>
                    <Td className="text-right tabular-nums">{e.cantidad}</Td>
                    {puedeGestionar ? (
                      <Td className="text-right">
                        <EnlaceBotonHoja href={`?ajustar=${encodeURIComponent(e.talla)}`} icono={SlidersHorizontal} variante="ghost">
                          Ajustar
                        </EnlaceBotonHoja>
                      </Td>
                    ) : null}
                  </Tr>
                ))}
              </tbody>
            </Table>
          </SeccionTarjeta>
          <SeccionTarjeta titulo="Movimientos">
            <Movimientos items={movimientos} />
          </SeccionTarjeta>
          {puedeGestionar ? <HojaIngresoRopa tipoId={tipo.id} tallas={tipo.tallas} /> : null}
          {puedeGestionar ? <HojaAjusteRopa tipoId={tipo.id} existencias={existencias} /> : null}
        </div>
      ) : null}
    </DetailScreen>
  );
}
