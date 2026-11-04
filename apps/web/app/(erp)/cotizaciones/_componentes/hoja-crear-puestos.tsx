"use client";

import { useEffect, useMemo, useState } from "react";

import { Alerta, avisar, Button, Dialog, Skeleton } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { type Ajuste, FilaOfertaPuesto, type LineaOferta } from "./fila-oferta-puesto";

type Oferta = { cotizacionId: string; codigo: string; items: LineaOferta[]; pendientes: number };
type Creados = { creados: { nombre: string; instalacionId: string }[]; yaCreados: number };

/**
 * Crear puestos al ganar (R2, CPQ v4 `CrearPuestos`): lista lo que ofrece la cotización aceptada y
 * RRHH confirma qué crear, con otro nombre o menos posiciones si hace falta. Nada se crea sin esta
 * confirmación (`cpq.puestos.confirmar`); cada posición nace como puesto en PPC «Sin asignar».
 */
export function HojaCrearPuestos(p: {
  abierta: boolean;
  onCerrar: () => void;
  cotizacionId: string;
  costos: boolean;
  onHecho?: () => void;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [oferta, setOferta] = useState<Oferta | null>(null);
  const [ajustes, setAjustes] = useState<Record<string, Ajuste>>({});
  const [hecho, setHecho] = useState<Creados | null>(null);
  const cargar = ejecutar;
  useEffect(() => {
    void cargar<Oferta>("cpq.puestos.ofrecer", { cotizacionId: p.cotizacionId }, false, "ninguna").then((o) => {
      if (!o) return;
      setOferta(o);
      setAjustes(
        Object.fromEntries(
          o.items.map((l) => [
            l.lineaId,
            { incluir: true, cantidad: Math.max(l.posiciones - l.creados, 1), nombre: l.cargo ?? l.linea },
          ]),
        ),
      );
    });
  }, [cargar, p.cotizacionId]);

  const elegidos = useMemo(
    () =>
      (oferta?.items ?? []).filter(
        (l) => l.posiciones - l.creados > 0 && ajustes[l.lineaId]?.incluir,
      ),
    [oferta, ajustes],
  );
  const total = elegidos.reduce((t, l) => t + (ajustes[l.lineaId]?.cantidad ?? 0), 0);

  async function confirmar() {
    const r = await ejecutar<Creados>("cpq.puestos.confirmar", {
      cotizacionId: p.cotizacionId,
      puestos: elegidos.map((l) => ({
        lineaId: l.lineaId,
        cantidad: ajustes[l.lineaId]!.cantidad,
        nombre: ajustes[l.lineaId]!.nombre.trim(),
      })),
    });
    if (!r) return;
    avisar.exito(`${r.creados.length} puestos creados`);
    setHecho(r);
    p.onHecho?.();
  }
  if (hecho) {
    const instalaciones = [...new Set(hecho.creados.map((c) => c.instalacionId))];
    return (
      <Dialog abierto={p.abierta} onCerrar={p.onCerrar} titulo="Puestos creados" acciones={<Button onClick={p.onCerrar}>Cerrar</Button>}>
        <div className="flex flex-col gap-3">
          <Alerta tono="success" titulo={`Se crearon ${hecho.creados.length} puestos en PPC «Sin asignar»`}>
            Operaciones ya los ve para asignar personas.
          </Alerta>
          {instalaciones.map((id) => (
            <EnlaceBoton key={id} href={`/instalaciones/${id}/puestos`} variante="secondary">
              Ver puestos de la instalación
            </EnlaceBoton>
          ))}
        </div>
      </Dialog>
    );
  }
  return (
    <Dialog
      abierto={p.abierta}
      onCerrar={p.onCerrar}
      titulo="Crear puestos"
      descripcion={oferta ? `Cotización ${oferta.codigo} aceptada` : undefined}
      tamano="grande"
      acciones={
        <>
          <Button variant="secondary" onClick={p.onCerrar} disabled={pendiente}>
            Ahora no
          </Button>
          <Button disabled={pendiente || total === 0} onClick={() => void confirmar()}>
            {pendiente ? "Creando…" : `Confirmar y crear ${total} ${total === 1 ? "puesto" : "puestos"}`}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {error ? <Alerta tono="danger" titulo="No se pudieron crear los puestos">{error}</Alerta> : null}
        {!oferta && !error ? (
          <div aria-busy="true" className="flex flex-col gap-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : null}
        {oferta && oferta.items.length === 0 ? (
          <Alerta tono="info" titulo="La cotización no tiene líneas de guardias">
            No hay puestos que ofrecer.
          </Alerta>
        ) : null}
        {oferta?.items.length ? (
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
            {oferta.items.map((l) => (
              <FilaOfertaPuesto
                key={l.lineaId}
                l={l}
                a={ajustes[l.lineaId] ?? { incluir: false, cantidad: 1, nombre: l.linea }}
                costos={p.costos}
                onCambio={(a) => setAjustes((x) => ({ ...x, [l.lineaId]: a }))}
              />
            ))}
          </ul>
        ) : null}
        <p className="t-caption">
          RRHH confirma antes de crear. El sueldo cotizado no se copia al puesto: la estructura de sueldo se fija en
          Remuneraciones.
        </p>
      </div>
    </Dialog>
  );
}
