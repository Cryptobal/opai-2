"use client";

import { Archive, ArchiveRestore, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button, Campo, Dialog, Input, Menu } from "@opai/ds";

type Props = {
  titulo: string;
  archivada: boolean;
  onRenombrar: (titulo: string) => Promise<boolean>;
  onArchivar: (archivar: boolean) => Promise<boolean>;
  onBorrar: () => Promise<boolean>;
};

/**
 * Menú ⋯ de una conversación guardada (panel e historial): renombrar, archivar o desarchivar y
 * borrar. Borrar es irreversible y pide confirmar; las tres usan las capacidades `agente.conversaciones.*`.
 */
export function AccionesConversacion({
  titulo,
  archivada,
  onRenombrar,
  onArchivar,
  onBorrar,
}: Props) {
  const [dialogo, setDialogo] = useState<"renombrar" | "borrar" | null>(null);
  const [nuevo, setNuevo] = useState(titulo);
  const [trabajando, setTrabajando] = useState(false);
  const cerrar = () => setDialogo(null);
  async function confirmar(hacer: () => Promise<boolean>) {
    setTrabajando(true);
    const ok = await hacer();
    setTrabajando(false);
    if (ok) cerrar();
  }
  const valido = nuevo.trim().length > 0 && nuevo.trim().length <= 80;
  return (
    // Los clics (también los de los diálogos, que suben por el árbol de React) no activan la fila.
    <div role="presentation" onClick={(e) => e.stopPropagation()}>
      <Menu
        etiqueta={`Acciones de la conversación ${titulo}`}
        disparador={<MoreHorizontal className="size-5" aria-hidden />}
        claseDisparador="size-11"
        items={[
          {
            id: "renombrar",
            etiqueta: "Cambiar título",
            icono: Pencil,
            onSelect: () => {
              setNuevo(titulo);
              setDialogo("renombrar");
            },
          },
          {
            id: "archivar",
            etiqueta: archivada ? "Desarchivar" : "Archivar",
            icono: archivada ? ArchiveRestore : Archive,
            onSelect: () => void onArchivar(!archivada),
          },
          {
            id: "borrar",
            etiqueta: "Borrar",
            icono: Trash2,
            peligro: true,
            separador: true,
            onSelect: () => setDialogo("borrar"),
          },
        ]}
      />
      <Dialog
        abierto={dialogo === "renombrar"}
        onCerrar={cerrar}
        titulo="Cambiar título"
        descripcion="Solo tú ves tus conversaciones con OPAI."
        acciones={
          <>
            <Button variant="secondary" onClick={cerrar}>
              Cancelar
            </Button>
            <Button
              disabled={!valido || trabajando}
              onClick={() => void confirmar(() => onRenombrar(nuevo.trim()))}
            >
              Guardar
            </Button>
          </>
        }
      >
        <Campo etiqueta="Título" htmlFor="titulo-conversacion" ayuda="Hasta 80 caracteres.">
          <Input
            id="titulo-conversacion"
            value={nuevo}
            maxLength={80}
            onChange={(e) => setNuevo(e.target.value)}
          />
        </Campo>
      </Dialog>
      <Dialog
        abierto={dialogo === "borrar"}
        onCerrar={cerrar}
        titulo="¿Borrar esta conversación?"
        descripcion="Se borra para siempre y no se puede recuperar."
        acciones={
          <>
            <Button variant="secondary" onClick={cerrar}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={trabajando}
              onClick={() => void confirmar(onBorrar)}
            >
              Borrar
            </Button>
          </>
        }
      />
    </div>
  );
}
