import type { Capacidad } from "../../../types";
import { platformCatalogoList } from "./lista";
import { platformCatalogoPrecioSet } from "./precio-set";

/** Catálogo de módulos de Plataforma (CAR-204, ADR-071 adenda): qué incluye cada cobrable y su precio de lista. */
export const capacidadesCatalogo: readonly Capacidad[] = [
  platformCatalogoList,
  platformCatalogoPrecioSet,
];
