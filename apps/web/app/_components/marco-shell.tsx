"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { AppShell } from "@opai/ds";

import type { DatosShell } from "./tipos-shell";
export type { DatosShell } from "./tipos-shell";

import { useCabecera } from "./cabecera-contexto";
import { iconoShell } from "./icono-shell";
import { LinkMenu } from "./link-menu";
import { empresasShell } from "./empresas-shell";
import { usePendiente } from "./navegacion-pendiente";
import { PinFichaContexto, pinDeFicha } from "./pin-ficha-contexto";
import { useEpocaSesion } from "./refresco-navegador";
import type { PreferenciasShell } from "./preferencias-shell";
import { padreConfiguracion } from "./padre-configuracion";
import { menuCuentaShell } from "./menu-cuenta-shell";
import { propsPreferenciasShell } from "./shell-props-preferencias";

// La paleta (cmdk) se descarga al primer uso: no pesa en el JS inicial de cada ruta (ADR-037).
const Paleta = dynamic(() => import("./paleta").then((m) => m.Paleta), { ssr: false });
// Conserva el render de servidor de la campana; su contador ya se consulta después de pintar.
const Campana = dynamic(() => import("./campana").then((m) => m.Campana));
const CambiarPassword = dynamic(() => import("./cambiar-password").then((m) => m.CambiarPassword));
const Avisos = dynamic(() => import("./avisos").then((m) => m.Avisos), { ssr: false });
const Preferencias = dynamic(
  () => import("./preferencias-shell").then((m) => m.PreferenciasDelShell),
  { ssr: false },
);
const PortalInicio = dynamic(() => import("./portal-inicio").then((m) => m.PortalInicio));

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
  // ERP con acceso: búsqueda, ⌘K y preferencias; sin acceso el shell avisa «Sin permisos».
  const enErp = datos.portal === "erp" && datos.tenant !== null && datos.acceso;
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
  const nav = useMemo(
    () => datos.nav.map((n) => ({ ...n, icono: iconoShell(n.icono, datos.iconos) })),
    [datos.nav, datos.iconos],
  );
  const Building2 = useMemo(() => iconoShell("Building2", datos.iconos), [datos.iconos]);
  // Navegación en curso (ADR-045): el riel marca el destino y la cabecera pone su título de inmediato,
  // sin esperar al contenido nuevo (sin parpadeo ni barra de progreso, decisión 1 de ADR-045). Al
  // terminar, `pendiente` se limpia y la página fija su propia cabecera.
  const pendiente = usePendiente();
  const rutaEfectiva = pendiente ?? rutaActual;
  const padre = padreConfiguracion(rutaActual);
  const navPendiente = pendiente ? nav.find((n) => n.href === pendiente) : undefined;
  const enConfiguracion = rutaEfectiva.startsWith("/configuracion");
  const tituloEfectivo = enConfiguracion
    ? "Configuración"
    : (navPendiente?.etiqueta ?? cabecera.titulo);
  // Preferencias D1/D3: isla post-hidratar; barra inferior por defecto del rol hasta cargar.
  const {
    navInferiorResuelto: navInferiorPreferido,
    esFicha,
    fichaFijada,
    onFijarFicha,
  } = (enErp ? preferencias : null) ?? {};
  const navInferiorDefecto = useMemo(
    () => datos.navInferior?.map((n) => ({ ...n, icono: iconoShell(n.icono, datos.iconos) })),
    [datos.navInferior, datos.iconos],
  );
  const navInferiorBase = navInferiorPreferido ?? navInferiorDefecto;
  const { boton: pinFicha, menu: pinMenu } = pinDeFicha(enErp && Boolean(esFicha), fichaFijada, onFijarFicha);
  // D5: Inicio muestra un punto (sin número) en la barra inferior cuando la Bandeja tiene algo
  // pendiente (avisos o aprobaciones); el número vive dentro de la pantalla, no en el shell.
  const bandejaPendiente = enErp && (preferencias?.bandejaPendiente ?? false);
  const navInferiorResuelto = useMemo(
    () =>
      navInferiorBase?.map((n) =>
        n.href === "/" ? { ...n, punto: true, alerta: bandejaPendiente } : n.href === "/cotizaciones" ? { ...n, corta: "Cotiz." } : n,
      ),
    [navInferiorBase, bandejaPendiente],
  );
  const empresas = empresasShell(datos.empresas, Building2);
  const menu = menuCuentaShell(enErp, (href) => router.push(href), () => setPassword(true),
    datos.portal === "erp" && datos.tenant !== null, datos.iconos,
    datos.acceso && datos.tenant && ["erp", "supervisor", "trabajador", "terreno"].includes(datos.portal) ? () => setInicio(true) : undefined);
  const conPin = (accion: ReactNode) => <>{accion}{pinFicha}</>;
  return (
    <PinFichaContexto.Provider value={pinMenu}>
      <AppShell
        {...cabecera}
        acciones={conPin(cabecera.acciones)}
        accionesTelefono={conPin(cabecera.accionesTelefono)}
        titulo={tituloEfectivo}
        busquedaCompacta={enConfiguracion}
        {...(padre ? { volver: padre, volverSoloTelefono: true } : {})}
        nav={nav.map((n) =>
          n.href === "/bandeja" ? { ...n, contador: preferencias?.bandejaContador ?? 0 } : n,
        )}
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
        {...(enErp && preferencias ? propsPreferenciasShell(preferencias) : {})}
        onNavegar={(href) => router.push(href)}
        Link={LinkMenu}
      >
        {children}
        {enErp ? (
          <Preferencias
            datos={datos}
            ruta={rutaEfectiva}
            titulo={cabecera.titulo}
            pendiente={Boolean(pendiente)}
            onCambiar={setPreferencias}
          />
        ) : null}
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
    </PinFichaContexto.Provider>
  );
}
