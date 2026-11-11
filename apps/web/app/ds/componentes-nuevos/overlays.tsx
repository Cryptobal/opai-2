"use client";

import { Download, LogOut, MoreHorizontal, Settings } from "lucide-react";
import { useState } from "react";

import {
  avisar,
  Button,
  Campo,
  Checkbox,
  CommandPalette,
  CerrarPopover,
  Dialog,
  Menu,
  Popover,
  Sheet,
  Textarea,
  Tooltip,
} from "@opai/ds";

import { buscarMuestra } from "./paleta-muestra";

const nada = () => undefined;

/** Menu, Dialog, Sheet, Popover, Tooltip, Toast y CommandPalette (Radix, cmdk, sonner). */
export function MuestraOverlays() {
  const [dialogo, setDialogo] = useState(false);
  const [hoja, setHoja] = useState(false);
  const [paleta, setPaleta] = useState(false);
  const [rm, setRm] = useState(true);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Menu
        etiqueta="Acciones"
        disparador={<MoreHorizontal className="size-5" />}
        claseDisparador="border border-border-strong bg-surface"
        items={[
          { id: "erp", grupo: "Portal", etiqueta: "ERP", marcado: true, onSelect: nada },
          { id: "sup", etiqueta: "Supervisor", onSelect: nada },
          {
            id: "pref",
            grupo: "Cuenta",
            etiqueta: "Preferencias",
            icono: Settings,
            onSelect: nada,
          },
          // Fila con número de pendientes (CAR-316: Novedades sin leer en el menú de cuenta).
          { id: "novedades", etiqueta: "Novedades", icono: Settings, contador: 3, onSelect: nada },
          { id: "salir", etiqueta: "Cerrar sesión", icono: LogOut, peligro: true, onSelect: nada },
        ]}
      />
      <Button variant="secondary" onClick={() => setDialogo(true)}>
        Dialog
      </Button>
      <Button variant="secondary" onClick={() => setHoja(true)}>
        Sheet
      </Button>
      <Popover
        etiqueta="Filtrar por región"
        alinear="start"
        disparador={<Button variant="secondary">Popover</Button>}
      >
        <div className="flex flex-col p-4">
          <p className="t-label">Filtrar por región</p>
          <Checkbox etiqueta="Metropolitana" marcado={rm} onCambiar={setRm} />
          <Checkbox etiqueta="Coquimbo" marcado={false} onCambiar={nada} />
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost">Limpiar</Button>
            <CerrarPopover asChild>
              <Button>Aplicar</Button>
            </CerrarPopover>
          </div>
        </div>
      </Popover>
      <Tooltip texto="Exportar a CSV">
        <Button variant="secondary" size="icon" aria-label="Exportar a CSV">
          <Download className="size-4" />
        </Button>
      </Tooltip>
      <Button
        variant="secondary"
        onClick={() => avisar.exito("Contacto creado", { etiqueta: "Deshacer", onClick: nada })}
      >
        Toast éxito
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          avisar.error("No pudimos guardar. Revisa tu conexión.", {
            etiqueta: "Reintentar",
            onClick: nada,
          })
        }
      >
        Toast error
      </Button>
      <Button variant="secondary" onClick={() => setPaleta(true)}>
        ⌘K
      </Button>
      <Dialog
        abierto={dialogo}
        onCerrar={() => setDialogo(false)}
        titulo="Rechazar solicitud"
        descripcion="Quitar a Beto Rojas (admin) · Grokbot"
        acciones={
          <>
            <Button variant="secondary" onClick={() => setDialogo(false)}>
              Cancelar
            </Button>
            <Button variant="destructive">Rechazar</Button>
          </>
        }
      >
        <Campo etiqueta="Motivo" htmlFor="motivo">
          <Textarea id="motivo" defaultValue="Sigue activo hasta fin de mes" />
        </Campo>
      </Dialog>
      <Sheet
        abierto={hoja}
        onCerrar={() => setHoja(false)}
        titulo="Nuevo contacto"
        acciones={
          <>
            <Button variant="secondary" onClick={() => setHoja(false)}>
              Cancelar
            </Button>
            <Button>Crear contacto</Button>
          </>
        }
      >
        <p className="text-base text-fg-muted">
          Inferior con asa en teléfono; lateral de 420 px en md+.
        </p>
      </Sheet>
      <CommandPalette
        abierto={paleta}
        onCerrar={() => setPaleta(false)}
        buscar={buscarMuestra}
        onElegir={() => setPaleta(false)}
      />
    </div>
  );
}
