import type { ReactNode } from "react";

import type { ItemMenu } from "../../components/menu";
import type { LinkComponent, Volver } from "../types";
import type {
  AreaIndice,
  FilaHilo,
  ListaHilo,
  PanelHilo,
  PendienteHilo,
  PortalHilo,
  SegmentoHilo,
} from "./tipos";

export type HiloShellProps = {
  /** De quién es el hilo: monograma y nombre de la empresa, y «portal · persona». */
  monograma: string;
  sujeto: string;
  sujetoSub: string;
  saludo: string;
  resumen: string;
  rutaActual: string;
  inicioHref: string;
  /** La pantalla abierta es una planilla: el hilo va plegado. */
  ancha: boolean;
  /** Cabecera de la página abierta en el lienzo. */
  titulo: string;
  sub?: string | undefined;
  insignia?: ReactNode;
  volver?: Volver | undefined;
  volverSoloMovil?: boolean | undefined;
  acciones?: ReactNode;
  accionesTelefono?: ReactNode;
  completo?: boolean | undefined;
  pendientes: ListaHilo<PendienteHilo>;
  actividad: ListaHilo<FilaHilo>;
  agenda: ListaHilo<FilaHilo>;
  /** Avisa el segmento abierto, para cargar Actividad y Agenda solo cuando se miran. */
  onSegmento?: ((s: SegmentoHilo) => void) | undefined;
  onReintentar?: ((s: SegmentoHilo) => void) | undefined;
  indice: readonly AreaIndice[];
  portales: readonly PortalHilo[];
  portalActual: string;
  empresas: readonly ItemMenu[];
  cuenta: readonly ItemMenu[];
  /** Barra: con agente invita a pedir y va en índigo; sin agente, busca. En H1 siempre abre la búsqueda. */
  barra: { agente: boolean; texto: string };
  onBuscar: () => void;
  onTema: () => void;
  /** Estado inicial, para `/ds` y las pruebas de marcado. */
  segmentoInicial?: SegmentoHilo;
  panelInicial?: PanelHilo;
  Link?: LinkComponent;
  children: ReactNode;
};
