"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { formatearFechaHora } from "@opai/domain";
import { Alerta, Sheet } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

type Detalle = {
  id: string;
  hash: string;
  tipoEtiqueta: string;
  metodoEtiqueta: string;
  gpsEtiqueta: string;
  horaServidor: string;
  personaNombre: string;
  instalacionNombre: string;
  dispositivoNombre: string | null;
  distanciaM: number | null;
  diferida: boolean;
  slugEmpresa: string;
};

export function HojaMarca({ marcaId, abierta, onCerrar, zona }: { marcaId: string | null; abierta: boolean; onCerrar: () => void; zona: string }) {
  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierta || !marcaId) return;
    let vivo = true;
    void (async () => {
      setCargando(true);
      setError(null);
      const r = await ejecutarCapacidad("erp", "asistencia.marcas.obtener", { id: marcaId });
      if (!vivo) return;
      setCargando(false);
      if (!r.ok) {
        setError(r.error.message);
        setDetalle(null);
        return;
      }
      setDetalle(r.data as Detalle);
    })();
    return () => {
      vivo = false;
    };
  }, [abierta, marcaId]);

  const hora = (iso: string) => formatearFechaHora(iso, zona, { segundos: true, fechaLarga: true });

  return (
    <Sheet abierto={abierta} onCerrar={onCerrar} titulo="Detalle de la marca" telefono="completo">
      {cargando ? <p className="t-body-sm text-fg-muted">Cargando…</p> : null}
      {error ? <Alerta tono="danger" titulo="No se pudo cargar">{error}</Alerta> : null}
      {detalle ? (
        <dl className="flex flex-col gap-3">
          <Par etiqueta="Trabajador" valor={detalle.personaNombre} />
          <Par etiqueta="Instalación" valor={detalle.instalacionNombre} />
          <Par etiqueta="Hora del servidor" valor={hora(detalle.horaServidor)} />
          <Par etiqueta="Tipo" valor={detalle.tipoEtiqueta} />
          <Par etiqueta="Método" valor={detalle.metodoEtiqueta} />
          <Par etiqueta="GPS" valor={detalle.gpsEtiqueta} />
          {detalle.distanciaM !== null ? <Par etiqueta="Distancia" valor={`${detalle.distanciaM} m`} /> : null}
          <Par etiqueta="Dispositivo" valor={detalle.dispositivoNombre ?? "—"} />
          <Par etiqueta="Hash" valor={detalle.hash} mono />
          {detalle.diferida ? <Alerta tono="info" titulo="Marca diferida">Llegó desde la cola sin conexión.</Alerta> : null}
          <Link
            className="t-body-sm text-accent hover:underline"
            href={`/verificar/marca/${detalle.slugEmpresa}/${detalle.hash}`}
            target="_blank"
            rel="noreferrer"
          >
            Abrir verificación pública
          </Link>
        </dl>
      ) : null}
    </Sheet>
  );
}

function Par({ etiqueta, valor, mono }: { etiqueta: string; valor: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="t-caption text-fg-muted">{etiqueta}</dt>
      <dd className={mono ? "t-body-sm font-mono break-all" : "t-body-sm"}>{valor}</dd>
    </div>
  );
}