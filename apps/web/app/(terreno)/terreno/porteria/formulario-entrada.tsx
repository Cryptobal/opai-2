"use client";

import { useState } from "react";

import { Alerta, Button, Campo, Input, Select } from "@opai/ds";
import {
  normalizarDocumento,
  normalizarPatente,
  type TipoDocumento,
} from "@opai/domain/acceso-documento";

import { encolarHecho } from "@/lib/terreno/cola";

import { DOCUMENTOS, TIPOS } from "./opciones";

/**
 * Registrar entrada (CAR-78 · E4d). Valida el documento en el teléfono (RUN con dígito verificador) y guarda la
 * entrada en la cola; el servidor cruza con las listas y puede denegarla (se ve en «Cola»). «Guardada» se dice
 * solo cuando la cola releyó el hecho del disco. El documento «leído» no se afirma vigente (R5).
 */
export function FormularioEntrada({ personaId }: { personaId: string }) {
  const [tipo, setTipo] = useState("visita");
  const [docTipo, setDocTipo] = useState<TipoDocumento>("run");
  const [numero, setNumero] = useState("");
  const [pais, setPais] = useState("");
  const [nombre, setNombre] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [motivo, setMotivo] = useState("");
  const [patente, setPatente] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<"libre" | "guardando" | "guardada">("libre");

  const registrar = async () => {
    const doc = normalizarDocumento({ tipo: docTipo, numero, ...(pais ? { pais } : {}) });
    if (!doc)
      return setError(
        docTipo === "run"
          ? "El RUN no es válido. Revisa el dígito verificador."
          : "Revisa el documento y el país.",
      );
    if (nombre.trim().length < 2) return setError("Escribe el nombre de la persona.");
    if (patente && !normalizarPatente(patente)) return setError("La patente no es válida.");
    setError(null);
    setEstado("guardando");
    try {
      await encolarHecho({
        tipo: "acceso.entrada",
        payload: {
          tipoRegistro: tipo,
          documento: { tipo: docTipo, numero, ...(pais ? { pais } : {}) },
          nombre: nombre.trim(),
          ...(empresa.trim() ? { empresa: empresa.trim() } : {}),
          ...(motivo.trim() ? { motivo: motivo.trim() } : {}),
          ...(patente.trim() ? { patente } : {}),
        },
        personaId,
      });
      setNumero("");
      setNombre("");
      setEmpresa("");
      setMotivo("");
      setPatente("");
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
        <Select id="p-tipo" valor={tipo} opciones={TIPOS} onCambiar={cambia(setTipo)} />
      </Campo>
      <Campo etiqueta="Documento" htmlFor="p-doc">
        <Select
          id="p-doc"
          valor={docTipo}
          opciones={DOCUMENTOS}
          onCambiar={(v) => setDocTipo(v as TipoDocumento)}
        />
      </Campo>
      <Campo etiqueta="Número de documento" htmlFor="p-numero">
        <Input
          id="p-numero"
          value={numero}
          maxLength={40}
          autoComplete="off"
          onChange={(e) => cambia(setNumero)(e.target.value)}
        />
      </Campo>
      {docTipo !== "run" ? (
        <Campo etiqueta="País (código de 2 o 3 letras)" htmlFor="p-pais">
          <Input
            id="p-pais"
            value={pais}
            maxLength={3}
            autoComplete="off"
            onChange={(e) => cambia(setPais)(e.target.value)}
          />
        </Campo>
      ) : null}
      <Campo etiqueta="Nombre y apellidos" htmlFor="p-nombre">
        <Input
          id="p-nombre"
          value={nombre}
          maxLength={120}
          autoComplete="off"
          onChange={(e) => cambia(setNombre)(e.target.value)}
        />
      </Campo>
      <Campo etiqueta="Empresa (opcional)" htmlFor="p-empresa">
        <Input
          id="p-empresa"
          value={empresa}
          maxLength={120}
          autoComplete="off"
          onChange={(e) => cambia(setEmpresa)(e.target.value)}
        />
      </Campo>
      <Campo etiqueta="Motivo (opcional)" htmlFor="p-motivo">
        <Input
          id="p-motivo"
          value={motivo}
          maxLength={200}
          autoComplete="off"
          onChange={(e) => cambia(setMotivo)(e.target.value)}
        />
      </Campo>
      {tipo === "vehiculo" ? (
        <Campo etiqueta="Patente" htmlFor="p-patente">
          <Input
            id="p-patente"
            value={patente}
            maxLength={12}
            autoComplete="off"
            onChange={(e) => cambia(setPatente)(e.target.value)}
          />
        </Campo>
      ) : null}
      {error ? (
        <Alerta tono="danger" titulo="Revisa los datos">
          {error}
        </Alerta>
      ) : null}
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
