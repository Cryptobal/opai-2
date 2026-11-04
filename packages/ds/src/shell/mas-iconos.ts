import { ClipboardList, File, Folder, Handshake, IdCard, Wallet, type LucideIcon } from "lucide-react";

/**
 * Iconos de las áreas en el menú «Más» del teléfono (diseño aprobado, CAR-182). Son distintos de los
 * de las entradas para que ningún ícono se repita dentro de la hoja. La barra lateral sigue con los
 * de `iconoDeArea`.
 */
const ICONOS: Record<string, LucideIcon> = {
  comercial: Handshake,
  operaciones: ClipboardList,
  personas: IdCard,
  finanzas: Wallet,
  documentos: File,
};

export function iconoDeAreaMas(area: string | undefined): LucideIcon {
  return (area && ICONOS[area]) || Folder;
}
