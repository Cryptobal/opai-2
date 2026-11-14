"use client";

import { useState } from "react";

import { avisar, Button } from "@opai/ds";

import { type Confirmacion, DialogoConfirmar } from "@/app/_components/maestros/dialogo-confirmar";
import { useCapacidad } from "@/app/_components/use-capacidad";

type Capacidad =
  "acceso.registros.salida" | "acceso.registros.anular" | "acceso.registros.cerrar_bloque";
type Accion = {
  id: string;
  capacidad: Capacidad;
  input: (motivo?: string) => unknown;
  exito: string;
};

/** Botón con confirmación (y motivo) que ejecuta una capacidad de corrección de acceso (CAR-477). */
function ConConfirmacion({
  etiqueta,
  variante,
  confirmacion,
  accion,
}: {
  etiqueta: string;
  variante: "secondary" | "ghost";
  confirmacion: Confirmacion;
  accion: Accion;
}) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [abierto, setAbierto] = useState(false);
  async function confirmar(motivo?: string) {
    const input = accion.input(motivo);
    // Ids literales: el gate de paridad verifica que la UI solo invoque capacidades públicas existentes.
    const r =
      accion.capacidad === "acceso.registros.salida"
        ? await ejecutar("acceso.registros.salida", input)
        : accion.capacidad === "acceso.registros.anular"
          ? await ejecutar("acceso.registros.anular", input)
          : await ejecutar("acceso.registros.cerrar_bloque", input);
    if (!r) return;
    avisar.exito(accion.exito);
    setAbierto(false);
  }
  return (
    <>
      <Button variant={variante} onClick={() => setAbierto(true)}>
        {etiqueta}
      </Button>
      {abierto ? (
        <DialogoConfirmar
          confirmacion={confirmacion}
          pendiente={pendiente}
          error={error}
          onCerrar={() => {
            limpiarError();
            setAbierto(false);
          }}
          onConfirmar={(m) => void confirmar(m)}
        />
      ) : null}
    </>
  );
}

/** Acciones de la ficha (diseño `AccesoDetalle`): registrar la salida si sigue en sitio y anular con motivo. */
export function AccionesRegistro({
  id,
  nombre,
  enSitio,
}: {
  id: string;
  nombre: string;
  enSitio: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {enSitio ? (
        <ConConfirmacion
          etiqueta="Registrar salida"
          variante="secondary"
          confirmacion={{
            titulo: "Registrar salida",
            descripcion: `${nombre} queda fuera del recinto con la hora de ahora. Úsalo si la portería no marcó la salida.`,
            boton: "Registrar salida",
          }}
          accion={{
            id,
            capacidad: "acceso.registros.salida",
            input: () => ({ id }),
            exito: "Salida registrada",
          }}
        />
      ) : null}
      <ConConfirmacion
        etiqueta="Anular registro"
        variante="ghost"
        confirmacion={{
          titulo: "Anular registro",
          descripcion: `El registro de ${nombre} queda anulado con tu motivo. No se borra: se conserva para la auditoría.`,
          boton: "Anular registro",
          peligro: true,
          motivo: true,
          motivoEtiqueta: "Motivo de la anulación",
        }}
        accion={{
          id,
          capacidad: "acceso.registros.anular",
          input: (m) => ({ id, motivo: m }),
          exito: "Registro anulado",
        }}
      />
    </div>
  );
}

/** Cerrar en bloque (R25): salida «no registrada» para todos los que siguen en sitio en una instalación. */
export function CerrarEnBloque({
  instalacionId,
  cuantos,
}: {
  instalacionId: string;
  cuantos: number;
}) {
  if (cuantos === 0) return null;
  return (
    <ConConfirmacion
      etiqueta="Cerrar en bloque"
      variante="secondary"
      confirmacion={{
        titulo: "Cerrar en bloque",
        descripcion:
          "Se registrará la salida de todos los que siguen en sitio en esta instalación, con la hora de ahora y tu motivo.",
        boton: "Cerrar en bloque",
        peligro: true,
        motivo: true,
        motivoEtiqueta: "Motivo (por ejemplo, «salida no registrada»)",
      }}
      accion={{
        id: instalacionId,
        capacidad: "acceso.registros.cerrar_bloque",
        input: (m) => ({ instalacionId, motivo: m }),
        exito: "Salidas registradas",
      }}
    />
  );
}
