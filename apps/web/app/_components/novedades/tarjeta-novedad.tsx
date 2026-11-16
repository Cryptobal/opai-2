"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { Badge, Button, SeccionTarjeta } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import { moduloNovedad } from "./modulo-novedad";
import { LineaNovedad, TextoNovedad } from "./texto-novedad";

export type ItemNovedad = {
  id: string;
  fecha: string;
  moduloEtiqueta: string;
  titulo: string;
  descripcion: string;
  ruta: string | null;
  imagen: string | null;
  destacada: boolean;
  car: string | null;
  leida: boolean;
};

function formatearFecha(iso: string): string {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}-${m}-${y}` : iso;
}

/**
 * Una novedad del producto, corta (CAR-430): módulo con su ícono, título, una línea de resumen y el
 * resto plegado en «Ver más». «Probarlo» lleva a la pantalla; «Marcar como leída» es secundario.
 */
export function TarjetaNovedad({
  item,
  onMarcar,
}: {
  item: ItemNovedad;
  onMarcar?: (id: string) => void;
}) {
  const [abierta, setAbierta] = useState(false);
  const modulo = moduloNovedad(item.ruta, item.moduloEtiqueta);
  const Icono = modulo.icono;
  const conMas = /\n\s*\n/.test(item.descripcion.trim()) || Boolean(item.imagen);
  return (
    <SeccionTarjeta
      titulo={item.titulo}
      {...(item.leida ? {} : { className: "border-accent" })}
      accion={item.leida ? null : <Badge tono="danger">Nueva</Badge>}
    >
      <p className="t-caption mb-2 flex items-center gap-1.5 text-fg-muted">
        <Icono className="size-3.5" aria-hidden />
        {modulo.etiqueta} · {formatearFecha(item.fecha)}
      </p>
      {abierta ? (
        <DetalleNovedad item={item} />
      ) : (
        <p className="t-body text-fg">
          <LineaNovedad texto={item.descripcion} />
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        {item.ruta ? (
          <EnlaceBoton href={item.ruta} className="h-11 md:h-9">
            Probarlo
          </EnlaceBoton>
        ) : null}
        {conMas ? (
          <Button
            variant="ghost"
            className="h-11 md:h-9"
            aria-expanded={abierta}
            data-sin-marcar=""
            onClick={() => setAbierta((v) => !v)}
          >
            {abierta ? "Ver menos" : "Ver más"}
            <ChevronDown className={abierta ? "size-4 rotate-180" : "size-4"} aria-hidden />
          </Button>
        ) : null}
        {!item.leida && onMarcar ? (
          <Button variant="ghost" className="h-11 md:h-9" onClick={() => onMarcar(item.id)}>
            Marcar como leída
          </Button>
        ) : null}
      </div>
    </SeccionTarjeta>
  );
}

function DetalleNovedad({ item }: { item: ItemNovedad }) {
  return (
    <>
      <TextoNovedad texto={item.descripcion} />
      {item.imagen ? (
        <div className="mt-3 max-w-md overflow-hidden rounded-md border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element -- imágenes opcionales en /public/changelog */}
          <img src={item.imagen} alt="" className="aspect-video w-full object-cover" />
        </div>
      ) : null}
      {item.car ? <p className="t-caption mt-2 text-fg-subtle">{item.car}</p> : null}
    </>
  );
}
