import { importarCatalogo, importarEjecutar, importarPlantilla } from "./capacidades";
import { importarLotes, importarRevertir } from "./lotes";

/** Motor común de importación de datos (CAR-279) con los importadores de Comercial. */
export const capacidadesImportar = [importarCatalogo, importarPlantilla, importarEjecutar, importarLotes, importarRevertir];
