"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Input } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { type RevisionHtml, RevisionPlantillaHtml } from "./revision-plantilla-html";

const MAX_BYTES = 400_000;

/** Sube un HTML de propuesta: se revisa (saneado y marcadores) antes de guardarlo como versión nueva. */
export function SubirPlantillaHtml() {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [nombre, setNombre] = useState("Propuesta");
  const [html, setHtml] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [revision, setRevision] = useState<RevisionHtml | null>(null);
  const [archivo, setArchivo] = useState(0);
  const entrada = () => ({ nombre: nombre.trim(), html });

  async function leer(f: File | undefined) {
    setRevision(null);
    setAviso(null);
    limpiarError();
    if (!f) return setHtml("");
    if (f.size > MAX_BYTES) {
      setHtml("");
      return setAviso("El archivo pesa más de 400 KB: sube uno más chico.");
    }
    setHtml(await f.text());
  }
  async function revisar() {
    setRevision(await ejecutar<RevisionHtml>("cpq.propuestas_html.importar", entrada(), true, "ninguna"));
  }
  async function guardar() {
    const r = await ejecutar<RevisionHtml>("cpq.propuestas_html.importar", entrada(), false, "layout", `html-${crypto.randomUUID()}`);
    if (!r) return;
    setRevision(r);
    if (!r.guardada) return;
    avisar.exito(r.activa ? `Plantilla v${r.version} guardada y en uso` : `Plantilla v${r.version} guardada (inactiva)`);
    setHtml("");
    setRevision(null);
    setArchivo((n) => n + 1);
  }
  const listo = revision !== null && revision.problemas.length === 0 && !revision.sinCambios;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 md:grid-cols-2">
        <Campo etiqueta="Nombre de la plantilla" htmlFor="html-nombre">
          <Input id="html-nombre" value={nombre} maxLength={120} onChange={(e) => { setNombre(e.target.value); setRevision(null); }} />
        </Campo>
        <Campo etiqueta="Archivo HTML" htmlFor="html-archivo" ayuda="El HTML que te devolvió la IA (.html, hasta 400 KB).">
          <Input key={archivo} id="html-archivo" type="file" accept=".html,.htm,text/html" onChange={(e) => leer(e.target.files?.[0])} />
        </Campo>
      </div>
      {aviso ? <Alerta tono="warning" titulo={aviso} /> : null}
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={revisar} disabled={pendiente || !html || !nombre.trim()}>
          Revisar HTML
        </Button>
        <Button variant="secondary" onClick={guardar} disabled={pendiente || !listo}>
          Guardar plantilla HTML
        </Button>
      </div>
      {revision ? <RevisionPlantillaHtml r={revision} /> : null}
    </div>
  );
}
