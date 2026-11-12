import {
  ajustesDesempeno,
  capacidadesDesempeno,
  defineModule,
  PERMISOS_DESEMPENO,
} from "@opai/capabilities";

/**
 * Manifest del módulo Desempeño (ADR-094, CAR-306). Se vende aparte. Mide la gestión de cada cargo
 * con indicadores del catálogo del núcleo: scorecard por cargo (indicadores, meta y peso) y resultado
 * por persona. Las capacidades viven en packages/capabilities/src/desempeno y el dominio puro en
 * packages/domain/src/desempeno. Pantallas en apps/web/app/(erp)/desempeno (CAR-307, diseño aprobado
 * en docs/2.0/design/export-desempeno/).
 */
export const manifest = defineModule({
  id: "desempeno",
  nombre: "Desempeño",
  version: "0.1.0",
  dependencias: [],
  permisos: [
    { id: PERMISOS_DESEMPENO.scorecardsRead, descripcion: "Ver el scorecard de cada cargo" },
    {
      id: PERMISOS_DESEMPENO.scorecardsManage,
      descripcion: "Configurar el scorecard de cada cargo: indicadores, metas y pesos",
    },
    {
      id: PERMISOS_DESEMPENO.resultadosVer,
      descripcion: "Ver el resultado propio y el de las personas a cargo",
    },
    {
      id: PERMISOS_DESEMPENO.resultadosVerTodos,
      descripcion: "Ver el resultado de todas las personas de la empresa",
    },
  ],
  navegacion: [
    {
      portal: "erp",
      area: "personas",
      href: "/desempeno",
      etiqueta: "Desempeño",
      icono: "Gauge",
      orden: 40,
      permiso: PERMISOS_DESEMPENO.scorecardsRead,
    },
  ],
  configuracion: ajustesDesempeno,
  eventos: [
    { id: "desempeno.scorecard.guardado", descripcion: "Se guardó un borrador del scorecard de un cargo." },
    { id: "desempeno.scorecard.publicado", descripcion: "Se publicó el scorecard de un cargo." },
    { id: "desempeno.propio.guardado", descripcion: "Se guardó un borrador de un indicador propio." },
    { id: "desempeno.propio.publicado", descripcion: "Se publicó un indicador propio de la empresa." },
    { id: "desempeno.propio.archivado", descripcion: "Se archivó un indicador propio de la empresa." },
    { id: "desempeno.periodo.cerrado", descripcion: "Se cerró un mes: su resultado quedó guardado y ya no cambia." },
  ],
  capacidades: capacidadesDesempeno,
});
