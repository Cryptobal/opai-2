"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { AppShell, type ItemMenu, type Portal } from "@opai/ds";

import { cambiarTenant } from "@/app/_acciones/capacidad";
import type { GrupoArea } from "@/lib/navegacion-areas";
import type { AccionCmdK } from "@/lib/navegacion-entradas";
import type { ItemNav } from "@/lib/navegacion";

import { useCabecera } from "./cabecera-contexto";
import { FijarFichaContext, usePinFicha } from "./fijar-ficha";
import { iconoShell } from "./icono-shell";
import { LinkMenu } from "./link-menu";
import { trasLimpiarCaches } from "./limpiar-cache-diferido";
import { usePendiente } from "./navegacion-pendiente";
import { useEpocaSesion } from "./refresco-navegador";
import type { PreferenciasShell } from "./preferencias-shell";
import { menuCuentaShell } from "./menu-cuenta-shell";

// La paleta (cmdk) se descarga al primer uso: no pesa en el JS inicial de cada ruta (ADR-037).
const Paleta = dynamic(() => import("./paleta").then((m) => m.Paleta), { ssr: false });
// Conserva el render de servidor de la campana; su contador ya se consulta después de pintar.
const Campana = dynamic(() => import("./campana").then((m) => m.Campana));
// Los avisos (sonner) también: se montan después de hidratar y no bloquean el primer render.
// El cambio de contraseña (formulario y diálogo) solo se descarga si se abre.
const CambiarPassword = dynamic(() => import("./cambiar-password").then((m) => m.CambiarPassword));
const Avisos = dynamic(() => import("./avisos").then((m) => m.Avisos), { ssr: false });
const Preferencias = dynamic(() => import("./preferencias-shell").then((m) => m.PreferenciasDelShell), { ssr: false });
const PortalInicio = dynamic(() => import("./portal-inicio").then((m) => m.PortalInicio));

export type DatosShell = {
  portal: string;
  /** Acceso al portal actual en la empresa actual (`datos-shell.ts`). Sin acceso, el shell se monta
   *  igual pero sin búsqueda, ⌘K ni Preferencias; el aviso «Sin permisos» vive en la página. */
  acceso: boolean;
  nav: ItemNav[];
  iconos?: Record<string, ReactNode>;
  /** Solo el ERP (Brief 05): grupos por área (acordeón, D1) con el área principal del rol ya
   *  resuelta en `navInferior` (sin leer las preferencias del usuario en el servidor, ADR-045). */
  grupos?: GrupoArea[];
  navInferior?: ItemNav[];
  /** Acciones de ⌘K (§7), ya filtradas por permiso y módulo activo. */
  acciones?: AccionCmdK[];
  portales: Portal[];
  tenant: { nombre: string } | null;
  usuario: { nombre: string; email: string; rol?: string };
  empresas: { id: string; nombre: string; actual: boolean }[];
  /** Quién y en qué empresa ve la página (`lib/epoca-sesion.ts`); las pestañas la comparan. */
  epoca: string;
};

/**
 * Shell persistente del portal (ADR-045): vive en el layout de cada portal, así que la navegación,
 * los portales, la campana, ⌘K y el menú de usuario no se vuelven a montar al cambiar de página; solo
 * se reemplaza el contenido. El título y las acciones de la página llegan por el almacén de cabecera
 * (`cabecera-contexto`), que la página fija al renderizarse.
 */
export function MarcoShell({ datos, children }: { datos: DatosShell; children: ReactNode }) {
  const rutaActual = usePathname();
  const router = useRouter();
  const cabecera = useCabecera();
  const [password, setPassword] = useState(false);
  const [inicio, setInicio] = useState(false);
  const [paleta, setPaleta] = useState<boolean | null>(null);
  const [preferencias, setPreferencias] = useState<PreferenciasShell | null>(null);
  // El ERP del usuario con acceso: habilita búsqueda, ⌘K y Preferencias. Sin acceso al portal el
  // shell se monta igual (aviso «Sin permisos»), pero sin estas acciones y sin que la acción del
  // servidor (`ejecutarCapacidad`) devuelva nada del portal ajeno.
  const enErp = datos.portal === "erp" && datos.tenant !== null && datos.acceso;
  // Una revocación puede refrescar el layout sin cambiar la época de usuario/empresa.
  if (!enErp && preferencias !== null) setPreferencias(null);
  useEpocaSesion(datos.epoca);
  useEffect(() => {
    if (!enErp) return;
    const tecla = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaleta(true);
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [enErp]);
  // La navegación no cambia al fijar la cabecera: se recalcula solo cuando cambia `datos.nav`.
  const nav = useMemo(() => datos.nav.map((n) => ({ ...n, icono: iconoShell(n.icono, datos.iconos) })), [datos.nav, datos.iconos]);
  const Building2 = useMemo(() => iconoShell("Building2", datos.iconos), [datos.iconos]);
  // Navegación en curso (ADR-045): el riel marca el destino y la cabecera pone su título de inmediato,
  // sin esperar al contenido nuevo (sin parpadeo ni barra de progreso, decisión 1 de ADR-045). Al
  // terminar, `pendiente` se limpia y la página fija su propia cabecera.
  const pendiente = usePendiente();
  const rutaEfectiva = pendiente ?? rutaActual;
  const navPendiente = pendiente ? nav.find((n) => n.href === pendiente) : undefined;
  const tituloEfectivo = navPendiente?.etiqueta ?? cabecera.titulo;
  // Recientes (§4.3, §10): solo en este navegador, por usuario y empresa; no cuando hay un
  // destino pendiente (se registraría dos veces al llegar) ni mientras no haya acceso.
  // Preferencias de navegación (D1, D3, §3): se cargan después de montar, sin sumar consultas al
  // servidor por navegación (ADR-045); hasta entonces, la barra inferior usa el área por defecto
  // del rol que ya trae `datos.navInferior` y el acordeón abre la del lugar actual.
  const {
    navInferiorResuelto: navInferiorPreferido,
    esFicha,
    fichaFijada,
    onFijarFicha,
  } = (enErp ? preferencias : null) ?? {};
  const navInferiorDefecto = useMemo(
    () => datos.navInferior?.map((n) => ({ ...n, icono: iconoShell(n.icono, datos.iconos) })), [datos.navInferior, datos.iconos],
  );
  const navInferiorBase = navInferiorPreferido ?? navInferiorDefecto;
  const { contexto: fijarFicha, boton: pinFicha } = usePinFicha(enErp && Boolean(esFicha), fichaFijada, onFijarFicha);
  // D5: Inicio muestra un punto (sin número) en la barra inferior cuando la Bandeja tiene algo
  // pendiente (avisos o aprobaciones); el número vive dentro de la pantalla, no en el shell.
  const bandejaPendiente = enErp && (preferencias?.bandejaPendiente ?? false);
  const navInferiorResuelto = useMemo(
    () =>
      navInferiorBase?.map((n) =>
        n.href === "/" ? { ...n, punto: true, alerta: bandejaPendiente } : n,
      ),
    [navInferiorBase, bandejaPendiente],
  );
  const empresas: ItemMenu[] =
    datos.empresas.length > 1
      ? datos.empresas.map((e, i) => ({
          id: `t-${e.id}`,
          ...(i === 0 ? { grupo: "Cambiar de empresa" } : {}),
          etiqueta: e.nombre,
          icono: Building2,
          marcado: e.actual,
          // Cambiar de empresa limpia las cachés del service worker antes de redirigir (§4.4, CA8).
          onSelect: () => trasLimpiarCaches(() => cambiarTenant(e.id)),
        }))
      : [];
  const menu = menuCuentaShell(enErp, (href) => router.push(href), () => setPassword(true), datos.portal === "erp" && datos.tenant !== null, datos.iconos, datos.acceso && datos.tenant && ["erp", "supervisor", "trabajador", "terreno"].includes(datos.portal) ? () => setInicio(true) : undefined);
  const conPin = (accion: ReactNode) => <>{accion}{pinFicha}</>;
  return (
    <FijarFichaContext.Provider value={fijarFicha}>
    <AppShell
      {...cabecera}
      acciones={conPin(cabecera.acciones)}
      accionesTelefono={conPin(cabecera.accionesTelefono)}
      titulo={tituloEfectivo}
      nav={nav}
      {...(navInferiorResuelto ? { navInferior: navInferiorResuelto } : {})}
      portales={datos.portales}
      portalActual={datos.portal}
      rutaActual={rutaEfectiva}
      {...(datos.tenant ? { tenant: datos.tenant } : {})}
      {...(empresas.length ? { empresas } : {})}
      usuario={datos.usuario}
      menuUsuario={menu}
      campana={
        datos.tenant ? (
          <Campana key={datos.epoca} portal={datos.portal} pendiente={bandejaPendiente} />
        ) : undefined
      }
      {...(enErp ? { onBuscar: () => setPaleta(true) } : {})}
      {...(enErp && preferencias ? {
        fijados: preferencias.fijados,
        errorFijados: preferencias.errorFijados,
        reintentarFijados: () => { void preferencias.reintentarFijados(); },
        onFijar: preferencias.onFijar,
        onDesfijar: preferencias.onDesfijar,
        areaAbierta: preferencias.areaAbierta,
        onAreaAbierta: preferencias.onAreaAbierta,
      } : {})}
      onNavegar={(href) => router.push(href)}
      Link={LinkMenu}
    >
      {children}
      {enErp ? <Preferencias datos={datos} ruta={rutaEfectiva} titulo={cabecera.titulo} pendiente={Boolean(pendiente)} onCambiar={setPreferencias} /> : null}
      {paleta !== null ? (
        <Paleta
          abierto={paleta}
          onCerrar={() => setPaleta(false)}
          epoca={datos.epoca}
          acciones={datos.acciones ?? []}
          nav={datos.nav}
        />
      ) : null}
      {password ? <CambiarPassword abierto onCerrar={() => setPassword(false)} /> : null}
      {inicio ? <PortalInicio portal={datos.portal} onCerrar={() => setInicio(false)} /> : null}
      <Avisos />
    </AppShell>
    </FijarFichaContext.Provider>
  );
}
