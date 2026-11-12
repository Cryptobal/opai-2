"use client";

import {
  Banknote,
  Briefcase,
  FileText,
  Home,
  Inbox,
  Settings,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { type LinkComponent, type NavItem } from "@opai/ds";
import { ShellNuevo } from "@opai/ds/shell-nuevo";

const LinkNext: LinkComponent = ({ href, className, children, ...rest }) => (
  <Link href={href} className={className} {...rest}>
    {children}
  </Link>
);

const B = "/ds/nuevo/marco";
const NAV: NavItem[] = [
  { href: B, etiqueta: "Inicio", icono: Home, exacta: true },
  { href: `${B}?p=bandeja`, etiqueta: "Bandeja", icono: Inbox, contador: 3 },
  { href: `${B}?p=agente`, etiqueta: "Agente", icono: Sparkles },
  {
    href: `${B}?p=negocios`,
    etiqueta: "Negocios",
    icono: Briefcase,
    grupo: "Comercial",
    area: "comercial",
  },
  {
    href: `${B}?p=cotizaciones`,
    etiqueta: "Cotizaciones",
    icono: Briefcase,
    grupo: "Comercial",
    area: "comercial",
  },
  {
    href: `${B}?p=pauta`,
    etiqueta: "Pauta diaria",
    icono: Shield,
    grupo: "Operaciones",
    area: "operaciones",
  },
  {
    href: `${B}?p=personas`,
    etiqueta: "Personas",
    icono: Users,
    grupo: "Personas",
    area: "personas",
  },
  {
    href: `${B}?p=flujo`,
    etiqueta: "Flujo de caja",
    icono: Banknote,
    grupo: "Finanzas",
    area: "finanzas",
  },
  {
    href: `${B}?p=documentos`,
    etiqueta: "Explorador",
    icono: FileText,
    grupo: "Documentos",
    area: "documentos",
  },
  { href: `${B}?p=config`, etiqueta: "Configuración", icono: Settings, pie: true },
];

/** Marco nuevo con navegación ficticia: menú con áreas en acordeón, plegable y que se asoma. */
export function MuestraMarco() {
  const ruta = usePathname();
  const [area, setArea] = useState<string | null>("comercial");
  return (
    <ShellNuevo
      titulo="Inicio"
      nav={NAV}
      rutaActual={ruta}
      portales={[{ id: "erp", etiqueta: "ERP", href: "/" }]}
      portalActual="erp"
      tenant={{ nombre: "Empresa de ejemplo" }}
      usuario={{ nombre: "Camila Rojas", email: "camila@ejemplo.cl", rol: "Owner" }}
      areaAbierta={area}
      onAreaAbierta={(a) => setArea(area === a ? null : a)}
      onBuscar={() => undefined}
      Link={LinkNext}
    >
      <div className="flex flex-col gap-2 py-6" data-testid="contenido-marco">
        <h1 className="text-2xl font-semibold tracking-tight">Buenas tardes, Camila</h1>
        <p className="text-fg-muted">Contenido de ejemplo dentro del marco nuevo.</p>
      </div>
    </ShellNuevo>
  );
}
