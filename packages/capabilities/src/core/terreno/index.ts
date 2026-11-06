import { capacidadesBiometria } from "../biometria";
import { capacidadesDispositivos } from "./dispositivos";
import { capacidadesCredencialesTerreno } from "./credenciales";
import { hechosRecibir } from "./hechos";
import { hechosListar, personasListarTerreno } from "./hechos-lectura";

export const capacidadesTerreno = [
  ...capacidadesCredencialesTerreno,
  ...capacidadesDispositivos,
  ...capacidadesBiometria,
  hechosRecibir,
  personasListarTerreno,
  hechosListar,
];
