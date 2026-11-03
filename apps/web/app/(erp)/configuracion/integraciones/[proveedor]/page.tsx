import { formatearNumero, formatearUsd } from "@opai/domain";
import { notFound } from "next/navigation";

import { Alerta, Badge, Button, SeccionTarjeta } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { datosSiHayPermiso, exigirDatos } from "@/lib/carga";
import { haceCuanto } from "@/lib/fechas";
import { requerirEncontrado } from "@/lib/ids";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { Credenciales } from "../_componentes/credenciales";
import { FORM_INTEGRACION } from "../../_centro/formularios";
import { FormIntegracion } from "../_componentes/form-integracion";
import { ProbarConexion } from "../_componentes/probar";
import { CATEGORIA, ESTADO, type Integracion } from "../_componentes/tipos";

export const metadata = { title: "Integración" };

type Resumen = { porRecurso: { clave: string; cantidad: number; costoUsd: number }[] };

async function cargar(proveedor: string) {
  if (proveedor !== "ia") {
    const r = await ejecutarComoUsuario<Integracion>("erp", "core.integraciones.get", {
      proveedor,
    });
    // Un proveedor que no existe es un 404; otro fallo, el error.tsx del ERP (CAR-50).
    requerirEncontrado(r);
    return { items: [exigirDatos(r)], consumo: null };
  }
  const [r, c] = await Promise.all([
    ejecutarComoUsuario<Integracion[]>("erp", "core.integraciones.list", {}),
    ejecutarComoUsuario<Resumen>("erp", "core.consumos.resumen", {}),
  ]);
  // Sin permiso de consumos no se muestra la tarjeta; otro fallo no se ve como «sin consumo».
  const resumen = datosSiHayPermiso(c, null);
  const ia = resumen ? resumen.porRecurso.filter((x) => x.clave.startsWith("ia.")) : [];
  return {
    items: exigirDatos(r).filter((i) => i.categoria === "ia"),
    consumo: resumen
      ? {
          tokens: ia.reduce((t, x) => t + x.cantidad, 0),
          usd: ia.reduce((t, x) => t + x.costoUsd, 0),
        }
      : null,
  };
}

const guardar = (
  <Button type="submit" form={FORM_INTEGRACION}>
    Guardar
  </Button>
);

/** Estado y resultado de la última prueba; en teléfono, también «Probar conexión» (la barra solo lleva Guardar). */
function PruebaIntegracion({ items }: { items: Integracion[] }) {
  const i = items[0];
  if (!i) return null;
  const e = ESTADO[i.estado];
  const falla = items.find((x) => x.ultimoError);
  const probada = items.find((x) => x.ultimoTestEn);
  const disponibles = items.filter((x) => x.estado === "configurada" || x.estado === "error");
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 md:hidden">
        {e ? <Badge tono={e.tono}>{e.texto}</Badge> : null}
        <ProbarConexion
          proveedores={(disponibles.length ? disponibles : items).map((x) => x.proveedor)}
        />
      </div>
      {falla ? (
        <Alerta
          tono="danger"
          titulo={`La última prueba falló${falla.ultimoTestEn ? ` ${haceCuanto(falla.ultimoTestEn)}` : ""}`}
        >
          {falla.ultimoError}
        </Alerta>
      ) : probada?.ultimoTestEn ? (
        <Alerta
          tono="success"
          titulo={`Última prueba correcta ${haceCuanto(probada.ultimoTestEn)}`}
        />
      ) : null}
    </>
  );
}

/** Detalle de una integración (29): modalidad, credenciales cifradas, configuración y prueba. */
export default function DetalleIntegracion({ params }: { params: Promise<{ proveedor: string }> }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Integración"
      ruta="/configuracion"
      cargando="detalle"
      volver={{ href: "/configuracion/integraciones", etiqueta: "Integraciones" }}
      accionesTelefono={guardar}
      cargar={async () => cargar((await params).proveedor)}
      opciones={({ items }) => {
        const i = items[0];
        const e = ESTADO[i?.estado ?? ""];
        const disponibles = items.filter((x) => x.estado === "configurada" || x.estado === "error");
        return {
          titulo: i
            ? items.length === 1
              ? i.nombre
              : (CATEGORIA[i.categoria]?.titulo ?? i.nombre)
            : "Integración",
          ...(e ? { insignia: <Badge tono={e.tono}>{e.texto}</Badge> } : {}),
          acciones: (
            <>
              <ProbarConexion
                proveedores={(disponibles.length ? disponibles : items).map((x) => x.proveedor)}
              />
              {guardar}
            </>
          ),
        };
      }}
    >
      {({ items, consumo }) => {
        const i = items[0];
        if (!i || i.estado === "proximamente") notFound();
        return (
          <div className="flex flex-col gap-4">
            <PruebaIntegracion items={items} />
            {i.proveedor === "dte_emision" ? (
              <Alerta tono="info" titulo="Folios (CAF)">
                <p className="t-body-sm">
                  Los rangos de folios autorizados por el SII se cargan en Facturación, aparte del certificado
                  digital.
                </p>
                <EnlaceBoton href="/finanzas/folios" variante="secondary" className="mt-3">
                  Administrar folios
                </EnlaceBoton>
              </Alerta>
            ) : null}
            <FormIntegracion items={items}>
              <Credenciales items={items} conNombre={items.length > 1} />
            </FormIntegracion>
            {consumo ? (
              <SeccionTarjeta titulo="Consumo del mes">
                <p className="t-numeric text-md font-semibold text-fg">
                  {formatearNumero(consumo.tokens)} tokens · {formatearUsd(consumo.usd)}
                </p>
                <p className="t-caption mt-1">
                  Con credenciales propias, el costo lo cobra el proveedor directamente.
                </p>
              </SeccionTarjeta>
            ) : null}
          </div>
        );
      }}
    </PaginaPortal>
  );
}
