import { capacidadesDispositivos } from "./dispositivos";
import { capacidadesCredencialesTerreno } from "./credenciales";

export const capacidadesTerreno = [...capacidadesCredencialesTerreno, ...capacidadesDispositivos];
