import { Check, RotateCcw, X } from "lucide-react";

import { type AccionEntidad } from "@/app/_components/maestros/acciones-entidad";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import type { NegocioDetalle } from "./datos";

// «Más acciones»: Editar, instalaciones, contactos y Archivar (export); Ganar/Perder o Reabrir van
// como botones en la cabecera. Cada acción abre su hoja por la URL o ejecuta su capacidad.
export function acciones(n: NegocioDetalle): AccionEntidad[] {
  const hoja = (id: string, etiqueta: string): AccionEntidad => ({
    id,
    etiqueta,
    parametro: { clave: id, valor: "1" },
  });
  if (n.archivadoEn) {
    return [
      {
        id: "desarchivar",
        etiqueta: "Desarchivar",
        capacidad: {
          id: "comercial.negocios.archivar",
          input: { id: n.id, archivar: false },
          exito: "Negocio desarchivado",
        },
      },
    ];
  }
  return [
    hoja("editar", "Editar"),
    hoja("instalaciones", "Instalaciones"),
    hoja("contactos", "Contactos"),
    {
      id: "archivar",
      etiqueta: "Archivar",
      peligro: true,
      capacidad: {
        id: "comercial.negocios.archivar",
        input: { id: n.id, archivar: true },
        exito: "Negocio archivado",
      },
      confirmar: {
        titulo: `Archivar ${n.titulo}`,
        descripcion: "Deja de aparecer en las listas por defecto; se conserva el historial.",
        boton: "Archivar",
        peligro: true,
      },
    },
  ];
}

/** Botones de cierre de la cabecera: Ganar y Perder (abierto) o Reabrir (perdido). */
export function Cierre({ n, base }: { n: NegocioDetalle; base: string }) {
  if (n.archivadoEn || n.estado === "ganado") return null;
  if (n.estado === "perdido")
    return (
      <EnlaceBoton href={`${base}?reabrir=1`} icono={RotateCcw}>
        Reabrir
      </EnlaceBoton>
    );
  return (
    <>
      <EnlaceBoton href={`${base}?perder=1`} variante="secondary" icono={X}>
        Perder
      </EnlaceBoton>
      <EnlaceBoton href={`${base}?ganar=1`} icono={Check}>
        Ganar
      </EnlaceBoton>
    </>
  );
}
