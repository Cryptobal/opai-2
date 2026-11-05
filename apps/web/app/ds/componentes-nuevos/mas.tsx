"use client";

import {
  Banknote,
  Briefcase,
  Building2,
  CalendarDays,
  HandCoins,
  Landmark,
  LayoutDashboard,
  MapPin,
  ReceiptText,
  Ticket,
} from "lucide-react";
import { useState } from "react";

import {
  AccesoRapido,
  BusquedaHoja,
  EncabezadoAreaMas,
  EntradaMas,
  type GrupoPaleta,
  type ItemFijado,
  MenuMas,
  type NavItem,
  Segmentado,
} from "@opai/ds";

const NAV: NavItem[] = [
  { href: "/negocios", etiqueta: "Negocios", icono: Briefcase, grupo: "Comercial", area: "comercial" },
  { href: "/cotizaciones", etiqueta: "Cotizaciones", icono: ReceiptText, grupo: "Comercial", area: "comercial" },
  { href: "/cuentas", etiqueta: "Cuentas", icono: Building2, grupo: "Comercial", area: "comercial" },
  { href: "/pauta", etiqueta: "Pauta", icono: CalendarDays, grupo: "Operaciones", area: "operaciones" },
  { href: "/instalaciones", etiqueta: "Instalaciones", icono: MapPin, grupo: "Operaciones", area: "operaciones" },
  { href: "/tickets", etiqueta: "Tickets", icono: Ticket, grupo: "Operaciones", area: "operaciones" },
  { href: "/remuneraciones", etiqueta: "Remuneraciones", icono: Banknote, grupo: "Personas", area: "personas" },
  { href: "/finanzas", etiqueta: "Hoy en Finanzas", icono: LayoutDashboard, grupo: "Finanzas", area: "finanzas" },
  { href: "/finanzas/cobranza", etiqueta: "Cobranza", icono: HandCoins, grupo: "Finanzas", area: "finanzas" },
  { href: "/finanzas/bancos", etiqueta: "Bancos", icono: Landmark, grupo: "Finanzas", area: "finanzas" },
];
const por = (href: string): ItemFijado => {
  const n = NAV.find((x) => x.href === href)!;
  return { href: n.href, etiqueta: n.etiqueta, icono: n.icono };
};
const INICIALES: GrupoPaleta[] = [
  { titulo: "Agente", items: [{ id: "a", etiqueta: "Preguntar a OPAI", href: "#" }] },
  { titulo: "Recientes", items: [{ id: "r", etiqueta: "Instalaciones", href: "/instalaciones", icono: MapPin }] },
  { titulo: "Acciones", items: [{ id: "n", etiqueta: "Nueva cuenta", href: "#", icono: Building2 }] },
];
const demora = () => new Promise<GrupoPaleta[]>((ok) => setTimeout(() => ok([{ titulo: "Cuentas", items: [{ id: "c", etiqueta: "Logística Andina SpA", detalle: "Cuenta", href: "#", icono: Building2 }] }]), 600));
const MODOS = [
  { id: "normal", etiqueta: "Normal" },
  { id: "vacio", etiqueta: "Sin fijados" },
  { id: "error", etiqueta: "Error" },
] as const;
const nada = () => undefined;

/** Menú «Más» (CAR-182): la hoja real con datos ficticios y las piezas nuevas con sus estados. */
export function MuestraMas() {
  const [modo, setModo] = useState<(typeof MODOS)[number]["id"]>("normal");
  const [fijados, setFijados] = useState([por("/finanzas/cobranza"), por("/cotizaciones")]);
  const item = por("/negocios");
  const fila = NAV[0]!;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <MenuMas
          items={NAV}
          extras={[]}
          epoca="ds"
          rutaActual="/tickets"
          disparador={<span className="t-label px-4">Abrir «Más» (hoja real)</span>}
          fijados={modo === "normal" ? fijados : []}
          recientes={() => (modo === "vacio" || modo === "error" ? [] : [por("/instalaciones"), por("/finanzas")])}
          {...(modo === "error" ? { errorFijados: true } : {})}
          onDesfijar={(h) => setFijados(fijados.filter((f) => f.href !== h))}
          onFijar={(i) => setFijados([...fijados, i])}
          onNavegar={nada}
          busqueda={(p) => <BusquedaHoja q={p.q} buscar={demora} iniciales={INICIALES} onElegir={p.onElegido} alternativa={{ etiqueta: "Volver al menú", onClick: p.onVolver }} />}
        />
        <Segmentado etiqueta="Estado de fijados" activa={modo} opciones={MODOS.map((m) => ({ ...m, onClick: () => setModo(m.id) }))} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-2" aria-label="AccesoRapido">
          <p className="t-overline">AccesoRapido · reposo, activo, fijado, edición</p>
          <AccesoRapido item={item} onNavegar={nada} />
          <AccesoRapido item={item} activo onNavegar={nada} />
          <AccesoRapido item={item} fijado onNavegar={nada} />
          <AccesoRapido item={item} onNavegar={nada} edicion={{ accion: "desfijar", onAccion: nada }} />
        </div>
        <div className="flex flex-col gap-1" aria-label="EntradaMas">
          <p className="t-overline">EntradaMas · reposo, activa, fijada, nombre largo</p>
          <EntradaMas item={fila} onNavegar={nada} />
          <EntradaMas item={fila} activo onNavegar={nada} />
          <EntradaMas item={fila} fijada onNavegar={nada} />
          <EntradaMas item={{ ...fila, etiqueta: "Configuración de la integración con el SII" }} onNavegar={nada} />
        </div>
        <div className="flex flex-col gap-1" aria-label="EncabezadoAreaMas">
          <p className="t-overline">EncabezadoAreaMas · abierta, plegada, con la página actual</p>
          <EncabezadoAreaMas nombre="Comercial" icono={Briefcase} cantidad={7} abierta controla="x" onAlternar={nada} />
          <EncabezadoAreaMas nombre="Finanzas" icono={Landmark} cantidad={6} abierta={false} controla="y" onAlternar={nada} />
          <EncabezadoAreaMas nombre="Operaciones" icono={MapPin} cantidad={2} abierta={false} contienePaginaActual controla="z" onAlternar={nada} />
        </div>
      </div>
    </div>
  );
}
