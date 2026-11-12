"use client";

import { useEffect, useState, useTransition } from "react";

import { variablesFueraDeClase } from "@opai/domain";
import { avisar } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

import type { PlantillaEditor } from "./tipos";

const llave = () => crypto.randomUUID();

/**
 * Estado del editor 06: texto (borrador o vigente), firma por defecto y quién firma. Guardar deja el
 * texto como borrador; publicar crea la versión siguiente. Todo por capacidades (paridad con el MCP):
 * `update` para la firma, `guardar_borrador` y `publicar` para el texto.
 */
export function useEditorPlantilla(inicial: PlantillaEditor) {
  const [p, setP] = useState(inicial);
  const [texto, setTexto] = useState(inicial.borrador?.contenido ?? inicial.contenido);
  const [guardado, setGuardado] = useState(texto);
  const [nivel, setNivel] = useState(inicial.nivelFirma);
  const [firmantes, setFirmantes] = useState(inicial.firmantes);
  const [pendiente, iniciar] = useTransition();

  const archivada = !p.activa;
  const desconocidas = variablesFueraDeClase(texto, inicial.clase);
  const firmaCambiada = nivel !== p.nivelFirma || firmantes !== p.firmantes;
  const hayCambios = !archivada && (texto !== guardado || firmaCambiada);
  const puedePublicar =
    !archivada &&
    !pendiente &&
    desconocidas.length === 0 &&
    texto.trim() !== "" &&
    texto !== p.contenido;

  // Salir con texto o firma sin guardar pide confirmación del navegador.
  useEffect(() => {
    if (!hayCambios) return;
    const avisarSalida = (ev: BeforeUnloadEvent) => ev.preventDefault();
    window.addEventListener("beforeunload", avisarSalida);
    return () => window.removeEventListener("beforeunload", avisarSalida);
  }, [hayCambios]);

  async function guardarFirma(): Promise<boolean> {
    if (!firmaCambiada) return true;
    const r = await ejecutarCapacidad(
      "erp",
      "core.documento_plantillas.update",
      { id: p.id, nivelFirma: nivel, firmantes },
      false,
      "layout",
      llave(),
    );
    if (!r.ok) avisar.error(r.error.message);
    else setP((x) => ({ ...x, nivelFirma: nivel, firmantes }));
    return r.ok;
  }

  const guardar = () =>
    iniciar(async () => {
      if (!(await guardarFirma())) return;
      if (texto === guardado) return void avisar.exito("Guardaste la firma de la plantilla.");
      const r = await ejecutarCapacidad(
        "erp",
        "core.documento_plantillas.guardar_borrador",
        { id: p.id, contenido: texto },
        false,
        "layout",
        llave(),
      );
      if (!r.ok) return void avisar.error(r.error.message);
      const nueva = r.data as PlantillaEditor;
      setP((x) => ({ ...x, borrador: nueva.borrador }));
      setGuardado(texto);
      avisar.exito(
        nueva.borrador ? "Guardaste el borrador." : "Sin cambios frente a la versión vigente.",
      );
    });

  const publicar = () =>
    iniciar(async () => {
      if (!(await guardarFirma())) return;
      const r = await ejecutarCapacidad(
        "erp",
        "core.documento_plantillas.publicar",
        { id: p.id, contenido: texto, versionEsperada: p.versionVigente },
        false,
        "layout",
        llave(),
      );
      if (!r.ok) return void avisar.error(r.error.message);
      const nueva = r.data as PlantillaEditor;
      setP(nueva);
      setGuardado(texto);
      avisar.exito(`Publicaste la versión ${nueva.versionVigente}.`);
    });

  return {
    p,
    archivada,
    texto,
    setTexto,
    nivel,
    setNivel,
    firmantes,
    setFirmantes,
    desconocidas,
    hayCambios,
    puedePublicar,
    pendiente,
    guardar,
    publicar,
  };
}
