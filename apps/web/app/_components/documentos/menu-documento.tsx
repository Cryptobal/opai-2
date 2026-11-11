"use client";

import { Archive, Download, Eye, MoreHorizontal, PenLine, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { avisar, Menu } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

import { useCapacidad } from "../use-capacidad";
import { DialogoConfirmar } from "../maestros/dialogo-confirmar";
import { useParametros } from "../maestros/use-url";
import type { Documento } from "./tipos";

/** Abre la descarga con la URL firmada de 5 minutos (`core.documentos.url_descarga`). */
export async function descargar(id: string) {
  const r = await ejecutarCapacidad("erp", "core.documentos.url_descarga", { id });
  if (r.ok) window.location.assign((r.data as { url: string }).url);
  else avisar.error(r.error.message);
}

/** Menú por documento (16): Ver, Descargar, Nueva versión y Archivar. */
export function MenuDocumento({ documento: d }: { documento: Documento }) {
  const { fijar } = useParametros();
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [archivar, setArchivar] = useState(false);
  return (
    <>
      <Menu
        etiqueta={`Acciones de ${d.nombre}`}
        disparador={<MoreHorizontal className="size-5" />}
        items={[
          { id: "ver", etiqueta: "Ver", icono: Eye, onSelect: () => fijar({ ver: d.id }) },
          {
            id: "bajar",
            etiqueta: "Descargar",
            icono: Download,
            onSelect: () => void descargar(d.id),
          },
          {
            id: "version",
            etiqueta: "Nueva versión",
            icono: Upload,
            onSelect: () =>
              fijar({ subir: "1", reemplaza: d.id, ...(d.tipoId ? { tipo: d.tipoId } : {}) }),
          },
          {
            id: "firmar",
            etiqueta: "Enviar a firma",
            icono: PenLine,
            onSelect: () => fijar({ firmar: d.id }),
          },
          {
            id: "archivar",
            etiqueta: "Archivar",
            icono: Archive,
            peligro: true,
            onSelect: () => setArchivar(true),
          },
        ]}
      />
      {archivar ? (
        <DialogoConfirmar
          confirmacion={{
            titulo: `Archivar ${d.nombre}`,
            descripcion:
              "Deja de verse en la ficha; el archivo y su registro en la bitácora se conservan.",
            boton: "Archivar",
            peligro: true,
          }}
          pendiente={pendiente}
          error={error}
          onCerrar={() => setArchivar(false)}
          onConfirmar={async () => {
            if (await ejecutar("core.documentos.archive", { id: d.id })) {
              avisar.exito("Documento archivado");
              setArchivar(false);
              fijar({ ver: null });
              router.refresh();
            }
          }}
        />
      ) : null}
    </>
  );
}
