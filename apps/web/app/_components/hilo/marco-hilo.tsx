"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { HiloShell } from "@opai/ds";

import { rutaAncha } from "@/lib/marco";

import { useAgenteShell } from "../agente/use-agente-shell";
import { AccesosProveedor, useBusquedaShell } from "../busqueda-mas-shell";
import { useCabecera } from "../cabecera-contexto";
import { empresasShell } from "../empresas-shell";
import { iconoShell } from "../icono-shell";
import { LinkMenu } from "../link-menu";
import { usePendiente } from "../navegacion-pendiente";
import { padreConfiguracion } from "../padre-configuracion";
import { useEpocaSesion } from "../refresco-navegador";
import type { DatosShell } from "../tipos-shell";
import { useMenuShell } from "../use-menu-shell";
import { useRegistrarReciente } from "../use-recientes";
import {
  indiceHilo,
  monogramaHilo,
  QUIEN_PORTAL,
  resumenHilo,
  saludoHilo,
  subLienzo,
  tituloDeRuta,
} from "./datos-hilo";
import { alternarTema } from "./marco-cliente";
import { useHilo } from "./use-hilo";

// Igual que en el marco clásico: nada de esto pesa en el JS inicial (ADR-037).
const Paleta = dynamic(() => import("../paleta").then((m) => m.Paleta), { ssr: false });
const CambiarPassword = dynamic(() => import("../cambiar-password").then((m) => m.CambiarPassword));
const Avisos = dynamic(() => import("../avisos").then((m) => m.Avisos), { ssr: false });
const PortalInicio = dynamic(() => import("../portal-inicio").then((m) => m.PortalInicio));

/**
 * Marco «Hilo» del ERP (ADR-090, etapa H1). Vive en el layout del portal, como el clásico: no se
 * vuelve a montar al navegar y solo cambia el contenido del lienzo. Usa las mismas páginas,
 * capacidades y navegación del manifiesto; lo único propio es cómo se reparte la pantalla.
 */
export function MarcoHilo({ datos, children }: { datos: DatosShell; children: ReactNode }) {
  const rutaActual = usePathname();
  const router = useRouter();
  const cabecera = useCabecera();
  const [password, setPassword] = useState(false);
  const [inicio, setInicio] = useState(false);
  const [paleta, setPaleta] = useState<boolean | null>(null);
  const agente = useAgenteShell(Boolean(datos.agente), datos.portal);
  const hilo = useHilo(datos.portal);
  useEpocaSesion(datos.epoca);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaleta(true);
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, []);
  const nav = useMemo(
    () => datos.nav.map((n) => ({ ...n, icono: iconoShell(n.icono, datos.iconos) })),
    [datos.nav, datos.iconos],
  );
  const indice = useMemo(() => indiceHilo(datos.nav), [datos.nav]);
  const busqueda = useBusquedaShell(datos, nav, () => setPaleta(true));
  // Navegación en curso (ADR-045): el lienzo nombra el destino de inmediato, sin esperar al contenido.
  const pendiente = usePendiente();
  const ruta = pendiente ?? rutaActual;
  const enConfiguracion = ruta.startsWith("/configuracion");
  // Mientras la página no fija su cabecera (primer render y hasta que hidrata), el lienzo ya nombra
  // la entrada del menú de la ruta: el título no aparece tarde.
  const titulo = enConfiguracion
    ? "Configuración"
    : ((pendiente ? datos.nav.find((n) => n.href === pendiente)?.etiqueta : undefined) ??
      (cabecera.titulo || tituloDeRuta(datos.nav, ruta)));
  const padre = padreConfiguracion(rutaActual);
  const volver = padre ?? cabecera.volver;
  useRegistrarReciente(datos.epoca, ruta, pendiente ? "" : cabecera.titulo, true);
  const Building2 = useMemo(() => iconoShell("Building2", datos.iconos), [datos.iconos]);
  const { menuUsuario } = useMenuShell(
    datos,
    true,
    router,
    () => setPassword(true),
    () => setInicio(true),
    "hilo",
  );
  const portal = datos.portales.find((p) => p.id === datos.portal)?.etiqueta ?? "ERP";
  const empresa = datos.tenant?.nombre ?? "OPAI";
  const n = hilo.pendientes.items.length;
  return (
    <HiloShell
      monograma={monogramaHilo(empresa)}
      sujeto={empresa}
      sujetoSub={`${portal} · ${datos.usuario.nombre}`}
      saludo={saludoHilo(new Date(), datos.usuario.nombre)}
      resumen={resumenHilo(hilo.pendientes.estado, n)}
      rutaActual={ruta}
      inicioHref="/"
      ancha={rutaAncha(ruta)}
      titulo={titulo}
      sub={subLienzo(datos.nav, ruta, volver)}
      insignia={cabecera.insignia}
      volver={volver}
      volverSoloMovil={padre ? true : cabecera.volverSoloTelefono}
      acciones={cabecera.acciones}
      accionesTelefono={cabecera.accionesTelefono}
      completo={cabecera.completo}
      pendientes={hilo.pendientes}
      actividad={hilo.actividad}
      agenda={hilo.agenda}
      onSegmento={hilo.onSegmento}
      onReintentar={hilo.onReintentar}
      indice={indice}
      portales={datos.portales.map((p) => {
        const descripcion = QUIEN_PORTAL[p.id];
        return descripcion ? { ...p, descripcion } : p;
      })}
      portalActual={datos.portal}
      empresas={empresasShell(datos.empresas, Building2)}
      cuenta={menuUsuario}
      barra={
        datos.agente
          ? { agente: true, texto: "Pide, pregunta o busca una pantalla" }
          : { agente: false, texto: "Busca una pantalla o un registro" }
      }
      onBuscar={() => setPaleta(true)}
      onTema={() => alternarTema(datos.portal)}
      Link={LinkMenu}
    >
      <AccesosProveedor
        enErp
        preferencias={null}
        recientes={busqueda.recientes}
        acciones={datos.acciones}
        ruta={rutaActual}
        onNavegar={router.push}
      >
        {children}
      </AccesosProveedor>
      {paleta !== null ? (
        <Paleta
          abierto={paleta}
          onCerrar={() => setPaleta(false)}
          epoca={datos.epoca}
          acciones={datos.acciones ?? []}
          nav={datos.nav}
          agente={Boolean(datos.agente)}
        />
      ) : null}
      {password ? <CambiarPassword abierto onCerrar={() => setPassword(false)} /> : null}
      {inicio ? <PortalInicio portal={datos.portal} onCerrar={() => setInicio(false)} /> : null}
      {agente.panel}
      <Avisos />
    </HiloShell>
  );
}
