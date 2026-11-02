"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Alerta,
  avisar,
  Badge,
  Campo,
  CampoSecreto,
  Input,
  SeccionTarjeta,
} from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import {
  archivoABase64,
  etiquetaVencimiento,
  formatearFechaCert,
  metaCertificadoDe,
  tonoVencimiento,
} from "./credenciales-dte-util";
import type { Integracion } from "./tipos";

const Uploader = dynamic(() => import("@opai/ds").then((m) => m.Uploader), { ssr: false });

/** Certificado .pfx/.p12 de emisión DTE (CAR-149): carga de archivo + clave, metadatos sin secretos. */
export function CredencialesDteEmision({ item }: { item: Integracion }) {
  const router = useRouter();
  const { ejecutar, pendiente } = useCapacidad("erp");
  const [clave, setClave] = useState("");
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const meta = metaCertificadoDe(item);
  const pfxGuardado = item.secretos.find((s) => s.nombre === "certificado_pfx")?.mascara;
  const apiKey = item.secretos.find((s) => s.nombre === "api_key");

  async function guardarCertificado(archivo: File) {
    setErrorLocal(null);
    const ext = archivo.name.split(".").pop()?.toLowerCase();
    if (ext !== "pfx" && ext !== "p12") throw new Error("Usa un archivo .pfx o .p12.");
    if (!clave.trim()) {
      throw new Error("Ingresa la clave del certificado antes de subir el archivo.");
    }
    const r = await ejecutar("core.integraciones.guardar_certificado_dte", {
      proveedor: "dte_emision",
      archivoBase64: await archivoABase64(archivo),
      claveCertificado: clave,
    });
    if (!r) throw new Error("No se pudo guardar el certificado.");
    avisar.exito("Certificado guardado cifrado");
    setClave("");
    router.refresh();
  }

  return (
    <>
      <SeccionTarjeta titulo="Certificado digital">
        <div className="flex flex-col gap-4">
          {meta ? (
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-raised p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-md font-medium text-fg">{meta.titular}</span>
                <Badge tono={tonoVencimiento(meta.venceEn)}>
                  {etiquetaVencimiento(meta.venceEn)}
                </Badge>
              </div>
              {meta.rutTitular ? (
                <p className="t-caption text-fg-muted">RUT titular · {meta.rutTitular}</p>
              ) : null}
              <p className="t-caption text-fg-muted">
                Vence el {formatearFechaCert(meta.venceEn)}
                {pfxGuardado ? ` · archivo ••••${pfxGuardado.slice(-4)}` : null}
              </p>
            </div>
          ) : pfxGuardado ? (
            <p className="t-caption text-fg-muted">
              Certificado configurado (••••{pfxGuardado.slice(-4)}). Sube uno nuevo para ver titular y
              vencimiento.
            </p>
          ) : null}
          {errorLocal ? <Alerta tono="danger" titulo={errorLocal} /> : null}
          <Campo etiqueta="Clave del certificado" htmlFor="dte-cert-clave">
            <Input
              id="dte-cert-clave"
              type="password"
              autoComplete="new-password"
              value={clave}
              disabled={pendiente}
              onChange={(e) => setClave(e.target.value)}
              placeholder="Clave del archivo .pfx"
            />
          </Campo>
          <Campo
            etiqueta={meta || pfxGuardado ? "Reemplazar certificado" : "Certificado digital (.pfx)"}
          >
            <Uploader
              accept=".pfx,.p12,application/x-pkcs12"
              tipos="PFX o P12"
              tamanoMaximoMb={0.25}
              disabled={pendiente}
              procesar={async (archivo, progreso) => {
                progreso(0.2);
                try {
                  await guardarCertificado(archivo);
                  progreso(1);
                } catch (e) {
                  const msg = e instanceof Error ? e.message : "No se pudo guardar el certificado.";
                  setErrorLocal(msg);
                  throw e;
                }
              }}
            />
          </Campo>
        </div>
      </SeccionTarjeta>
      {apiKey ? (
        <SeccionTarjeta titulo="SimpleAPI">
          <Campo etiqueta={apiKey.etiqueta} htmlFor="dte-api-key">
            <CampoSecreto
              id="dte-api-key"
              aria-label={apiKey.etiqueta}
              guardado={apiKey.mascara ? apiKey.mascara.slice(-4) : null}
              pendiente={pendiente}
              placeholder={apiKey.etiqueta}
              onGuardar={async (valor) => {
                const r = await ejecutar("core.integraciones.set_secreto", {
                  proveedor: item.proveedor,
                  nombre: "api_key",
                  valor,
                });
                if (r) {
                  avisar.exito("Credencial guardada cifrada");
                  router.refresh();
                } else avisar.error("No se pudo guardar la credencial");
              }}
            />
          </Campo>
        </SeccionTarjeta>
      ) : null}
    </>
  );
}
