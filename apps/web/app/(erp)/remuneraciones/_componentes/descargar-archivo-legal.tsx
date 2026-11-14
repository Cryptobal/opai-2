"use client";

import { useState } from "react";

import { Alerta, avisar, Badge, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

type Archivo = {
  nombre: string;
  contenido: string;
  filas: number;
  errores: { personaId: string | null; mensaje: string }[];
  advertencias: string[];
};

function descargar(nombre: string, contenido: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: nombre });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Genera el archivo LRE del período y lo descarga; muestra lo que hay que revisar antes de cargarlo. */
export function DescargarLre({ periodoId }: { periodoId: string }) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [archivo, setArchivo] = useState<Archivo | null>(null);
  async function generar() {
    const r = await ejecutar<Archivo>("nomina.lre.generar", { periodoId });
    if (!r) return;
    setArchivo(r);
    // Sin los datos del empleador el archivo no sirve: se muestran las observaciones y no se descarga.
    if (r.filas > 0 && !r.errores.some((e) => e.personaId === null)) {
      descargar(r.nombre, r.contenido);
      avisar.exito(`LRE descargado: ${r.filas} personas`);
    }
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" disabled={pendiente} onClick={() => void generar()}>
          Descargar LRE
        </Button>
        <Badge tono="neutro">Formato por verificar</Badge>
      </div>
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      {archivo && archivo.errores.length > 0 ? (
        <Alerta tono="warning" titulo={`Revisa ${archivo.errores.length} ${archivo.errores.length === 1 ? "observación" : "observaciones"} antes de cargarlo en Mi DT`}>
          {[...new Set(archivo.errores.map((e) => e.mensaje))].join(" ")}
        </Alerta>
      ) : null}
      {archivo ? <p className="t-caption text-fg-muted">{archivo.advertencias.join(" ")}</p> : null}
    </div>
  );
}
