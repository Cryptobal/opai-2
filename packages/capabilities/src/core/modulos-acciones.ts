import { modulesSolicitar } from "./modulos-solicitar";
import { modulesProbar, modulesPruebas } from "./pruebas-gratis";

/** Lo que una empresa hace con los módulos desde su ERP: solicitarlos o probarlos gratis (CAR-222). */
export const capacidadesModulos = [modulesSolicitar, modulesProbar, modulesPruebas];
