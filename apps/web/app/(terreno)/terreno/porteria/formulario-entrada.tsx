"use client";

import { useState } from "react";

import { Alerta, Button, Campo, Enlace, Select } from "@opai/ds";
import { AVISO_PRIVACIDAD_PORTERIA } from "@opai/domain/acceso-config";
import {
  camposDelTipo,
  CONFIG_ACCESO_DEFECTO,
  type ConfigAcceso,
} from "@opai/domain/acceso-config";
import type { TipoDocumento } from "@opai/domain/acceso-documento";

import { encolarHecho } from "@/lib/terreno/cola";

import { MAX, Texto } from "./campo-texto";
import { armarEntrada } from "./entrada-payload";
import { DOCUMENTOS, TIPOS } from "./opciones";

/**
 * Registrar entrada (CAR-78 · E4d, CAR-479). Pide lo que configuró la instalación (tipos, campos, orden y
 * obligatorios) y valida el documento en el teléfono; sin la configuración a mano, usa la de fábrica. Guarda la
 * entrada en la cola; el servidor cruza con las listas y puede denegarla (se ve en «Cola»). El documento «leído» no
 * se afirma vigente (R5).
 */
export function FormularioEntrada({
  personaId,
  config,
  puntoId,
  urlPrivacidad,
  avisoLinea,
}: {
  personaId: string;
  config?: ConfigAcceso | null;
  puntoId?: string | null;
  urlPrivacidad?: string;
  avisoLinea?: string;
}) {
  const c = config ?? CONFIG_ACCESO_DEFECTO;
  const [tipo, setTipo] = useState<string>(c.tipos[0] ?? "visita");
  const [docTipo, setDocTipo] = useState<TipoDocumento>("run");
  const [numero, setNumero] = useState("");
  const [pais, setPais] = useState("");
  const [nombre, setNombre] = useState("");
  const [valores, setValores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<"libre" | "guardando" | "guardada">("libre");

  // La configuración puede llegar después y no traer el tipo elegido: entonces rige el primero habilitado.
  const tipoActivo = c.tipos.some((t) => t === tipo) ? tipo : (c.tipos[0] ?? "visita");
  const registrar = async () => {
    const r = armarEntrada(c, { tipo: tipoActivo, docTipo, numero, pais, nombre, valores });
    if ("error" in r) return setError(r.error);
    setError(null);
    setEstado("guardando");
    try {
      const payload = { ...r.payload, ...(puntoId ? { puntoId } : {}) };
      await encolarHecho({ tipo: "acceso.entrada", payload, personaId });
      setNumero("");
      setNombre("");
      setValores({});
      setEstado("guardada");
    } catch {
      setError("No se pudo guardar la entrada en el teléfono. Vuelve a intentarlo.");
      setEstado("libre");
    }
  };
  const cambia = (f: (v: string) => void) => (v: string) => {
    f(v);
    setEstado("libre");
  };
  return (
    <section aria-label="Registrar entrada" className="flex flex-col gap-3">
      <h2 className="t-heading text-fg">Registrar entrada</h2>
      <Campo etiqueta="Tipo de registro" htmlFor="p-tipo">
        <Select
          id="p-tipo"
          valor={tipoActivo}
          opciones={TIPOS.filter((t) => c.tipos.some((x) => x === t.valor))}
          onCambiar={cambia(setTipo)}
        />
      </Campo>
      <Campo etiqueta="Documento" htmlFor="p-doc">
        <Select
          id="p-doc"
          valor={docTipo}
          opciones={DOCUMENTOS}
          onCambiar={(v) => setDocTipo(v as TipoDocumento)}
        />
      </Campo>
      <Texto
        id="p-numero"
        etiqueta="Número de documento"
        valor={numero}
        max={40}
        onCambiar={cambia(setNumero)}
      />
      {docTipo !== "run" ? (
        <Texto
          id="p-pais"
          etiqueta="País (código de 2 o 3 letras)"
          valor={pais}
          max={3}
          onCambiar={cambia(setPais)}
        />
      ) : null}
      <Texto
        id="p-nombre"
        etiqueta="Nombre y apellidos"
        valor={nombre}
        max={120}
        onCambiar={cambia(setNombre)}
      />
      {camposDelTipo(c, tipoActivo).map((f) => (
        <Texto
          key={f.id}
          id={`p-${f.id}`}
          etiqueta={f.obligatorio ? f.etiqueta : `${f.etiqueta} (opcional)`}
          valor={valores[f.id] ?? ""}
          max={MAX[f.id] ?? 200}
          onCambiar={cambia((v) => setValores((x) => ({ ...x, [f.id]: v })))}
        />
      ))}
      {error ? (
        <Alerta tono="danger" titulo="Revisa los datos">
          {error}
        </Alerta>
      ) : null}
      <p className="t-caption text-fg-muted">
        {avisoLinea ?? AVISO_PRIVACIDAD_PORTERIA.split("·")[0]?.trim()}
        {urlPrivacidad ? (
          <>
            {" · "}
            <Enlace href={urlPrivacidad} variante="fila">
              Más información
            </Enlace>
          </>
        ) : null}
      </p>
      <Button onClick={() => void registrar()} disabled={estado === "guardando"}>
        {estado === "guardando" ? "Guardando…" : "Registrar entrada"}
      </Button>
      {estado === "guardada" ? (
        <Alerta tono="success" titulo="Entrada guardada en el teléfono">
          Se envía sola cuando haya conexión. Si el servidor la deniega, la verás en «Cola».
        </Alerta>
      ) : null}
    </section>
  );
}
