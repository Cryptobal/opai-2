"use client";

import { Alerta, Button } from "@opai/ds";

export type Sugerencia = {
  disponible: boolean;
  borrador: string | null;
  fuentes: { id: string }[];
  faltantes: string[];
  aviso: string | null;
};

export function BorradorIa(p: {
  sugerencia: Sugerencia;
  borrador: string;
  pendiente: boolean;
  onAceptar: (texto: string) => void;
  onDescartar: () => void;
}) {
  const n = p.sugerencia.fuentes.length;
  return (
    <div aria-label="Borrador de IA" role="region" className="space-y-2 rounded-md bg-fill p-3">
      <p className="t-caption text-fg-muted">
        Borrador de IA basado en {n} {n === 1 ? "nota" : "notas"} del negocio. Revísalo: no se
        guarda hasta que lo aceptes.
      </p>
      <p className="t-body-sm whitespace-pre-wrap">{p.borrador}</p>
      {p.sugerencia.faltantes.length > 0 ? (
        <p className="t-caption text-fg-muted">Faltó: {p.sugerencia.faltantes.join(" ")}</p>
      ) : null}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => p.onAceptar(p.borrador)} disabled={p.pendiente}>
          Aceptar borrador
        </Button>
        <Button variant="ghost" onClick={p.onDescartar} disabled={p.pendiente}>
          Descartar
        </Button>
      </div>
    </div>
  );
}

export function AvisosIa({
  error,
  sugerencia,
}: {
  error: string | null;
  sugerencia: Sugerencia | null;
}) {
  return (
    <>
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      {sugerencia?.aviso ? <Alerta tono="info" titulo={sugerencia.aviso} /> : null}
      {sugerencia && !sugerencia.borrador && sugerencia.faltantes.length > 0 ? (
        <Alerta tono="info" titulo="La IA no pudo redactar">
          {sugerencia.faltantes.join(" ")}
        </Alerta>
      ) : null}
    </>
  );
}

export function CabeceraIa(p: {
  nombre: string;
  pendiente: boolean;
  conTexto: boolean;
  onPedir: (acortar: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="t-body font-medium">{p.nombre}</span>
      <div className="ml-auto flex gap-2">
        <Button variant="secondary" onClick={() => p.onPedir(false)} disabled={p.pendiente}>
          Redactar con IA
        </Button>
        <Button
          variant="ghost"
          onClick={() => p.onPedir(true)}
          disabled={p.pendiente || !p.conTexto}
        >
          Acortar con IA
        </Button>
      </div>
    </div>
  );
}
