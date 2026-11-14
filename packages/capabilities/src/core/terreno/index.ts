import { capacidadesBiometria } from "../biometria";
import { capacidadesDispositivos } from "./dispositivos";
import { capacidadesCredencialesTerreno } from "./credenciales";
import { hechosRecibir } from "./hechos";
import { accesoEnSitioTerreno } from "./acceso-sitio";
import { terrenoContexto } from "./contexto";
import { rondasEstadoTerreno } from "./rondas-estado";
import { hechosListar, personasListarTerreno } from "./hechos-lectura";
import { libroNovedadesListar } from "./libro-novedades";

export const capacidadesTerreno = [
  ...capacidadesCredencialesTerreno,
  ...capacidadesDispositivos,
  ...capacidadesBiometria,
  hechosRecibir,
  personasListarTerreno,
  hechosListar,
  terrenoContexto,
  accesoEnSitioTerreno,
  rondasEstadoTerreno,
  libroNovedadesListar,
];
