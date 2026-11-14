"use client";

import { useState } from "react";

import { Badge, Button, Empty, SeccionTarjeta } from "@opai/ds";

import { EditorCampo } from "./editor-campo";

export type EntidadCampo = "cuenta" | "contacto" | "negocio";
export type TipoCampo = "texto" | "numero" | "fecha" | "lista" | "si_no";
export type CampoConfig = {
  id: string;
  entidad: EntidadCampo;
  clave: string;
  etiqueta: string;
  tipo: TipoCampo;
  opciones: string[];
  obligatorio: boolean;
  orden: number;
  activo: boolean;
};

export const ENTIDADES: { valor: EntidadCampo; etiqueta: string }[] = [
  { valor: "cuenta", etiqueta: "Cuentas" },
  { valor: "contacto", etiqueta: "Contactos" },
  { valor: "negocio", etiqueta: "Negocios" },
];
export const TIPOS: { valor: TipoCampo; etiqueta: string }[] = [
  { valor: "texto", etiqueta: "Texto" },
  { valor: "numero", etiqueta: "Número" },
  { valor: "fecha", etiqueta: "Fecha" },
  { valor: "lista", etiqueta: "Lista de opciones" },
  { valor: "si_no", etiqueta: "Sí o no" },
];
const nombreTipo = (t: TipoCampo) => TIPOS.find((x) => x.valor === t)?.etiqueta ?? t;

type Editando = { campo: CampoConfig } | { nuevo: EntidadCampo } | null;

/** Campos por entidad, cada grupo con «Nuevo campo» y cada campo con «Editar». */
export function ListaCampos({ campos }: { campos: CampoConfig[] }) {
  const [editando, setEditando] = useState<Editando>(null);
  return (
    <div className="flex flex-col gap-4">
      {ENTIDADES.map((e) => {
        const propios = campos.filter((c) => c.entidad === e.valor);
        return (
          <SeccionTarjeta
            key={e.valor}
            titulo={e.etiqueta}
            accion={
              <Button variant="secondary" onClick={() => setEditando({ nuevo: e.valor })}>
                Nuevo campo
              </Button>
            }
            sinRelleno
          >
            {propios.length === 0 ? (
              <Empty
                titulo={`Sin campos en ${e.etiqueta.toLowerCase()}`}
                descripcion="Agrega datos propios de tu empresa, por ejemplo rubro, tamaño o fecha de renovación."
              />
            ) : (
              <ul className="divide-y divide-border">
                {propios.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{c.etiqueta}</span>
                        {c.obligatorio ? <Badge tono="accent">Obligatorio</Badge> : null}
                        {!c.activo ? <Badge>Archivado</Badge> : null}
                      </span>
                      <span className="t-caption">
                        {nombreTipo(c.tipo)}
                        {c.tipo === "lista" ? ` · ${c.opciones.join(", ")}` : ""}
                      </span>
                    </div>
                    <Button variant="secondary" onClick={() => setEditando({ campo: c })}>
                      Editar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </SeccionTarjeta>
        );
      })}
      {editando ? (
        <EditorCampo
          {...("campo" in editando ? { campo: editando.campo } : { entidad: editando.nuevo })}
          onCerrar={() => setEditando(null)}
        />
      ) : null}
    </div>
  );
}
