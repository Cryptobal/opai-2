"use client";

import Link from "next/link";

import type { LinkComponent } from "@opai/ds";

import { EstadoEnlace } from "./estado-enlace";

/**
 * Enlace del índice/riel de Configuración, con la precarga desactivada (`prefetch={false}`). El
 * índice tiene ~15 secciones y se repinta en cada página de `/configuracion/*`; cada sección es
 * dinámica (sesión, tenant y capacidades), así que un prefetch —aunque fuera por intención— hacía
 * un render completo de la sección en el servidor y su ráfaga de capacidades contra Neon. Al pasar
 * el cursor por el riel se precargaban varias secciones que nadie abrió (los picos de
 * `/configuracion/cumplimiento/retencion` y `/configuracion/marca` del QA en vivo del #135), que
 * agotaban el pool y disparaban P2028 (B1, 4.º ajuste). No hay esqueleto estático útil que precargar
 * aquí; la respuesta inmediata al clic la da `EstadoEnlace` (marca el riel y el título de destino).
 */
export const LinkIndice: LinkComponent = ({ href, className, children, ...rest }) => {
  return (
    <Link href={href} className={className} prefetch={false} {...rest}>
      {children}
      <EstadoEnlace href={href} />
    </Link>
  );
};
