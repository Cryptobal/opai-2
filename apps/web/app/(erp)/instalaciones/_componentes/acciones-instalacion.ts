import type { AccionEntidad } from "@/app/_components/maestros/acciones-entidad";
import type { InstalacionDetalle } from "@/lib/tipos-maestros";

/** Menú ⋯ de la ficha de instalación: editar, activar o desactivar y archivar. */
export function accionesInstalacion(i: InstalacionDetalle): AccionEntidad[] {
  const otro = i.estado === "activa" ? "inactiva" : "activa";
  return [
    { id: "editar", etiqueta: "Editar", parametro: { clave: "editar", valor: "1" } },
    {
      id: "estado",
      etiqueta: otro === "activa" ? "Activar" : "Desactivar",
      capacidad: {
        id: "core.instalaciones.set_estado",
        input: { id: i.id, estado: otro },
        exito: "Estado actualizado",
      },
    },
    {
      id: "archivar",
      etiqueta: "Archivar",
      peligro: true,
      capacidad: {
        id: "core.instalaciones.archive",
        input: { id: i.id },
        exito: "Instalación archivada",
      },
      confirmar: {
        titulo: `Archivar ${i.nombre}`,
        descripcion: "Exige que no tenga puestos activos. Sus datos y documentos se conservan.",
        boton: "Archivar",
        peligro: true,
      },
    },
  ];
}
