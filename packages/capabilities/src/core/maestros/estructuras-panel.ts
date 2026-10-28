import { vistaVinculo } from "./vinculos-vista";
import { vistaAprobaciones } from "../agentes/aprobaciones";
import { PERMISOS_CORE } from "@opai/domain";
import { defineCapability } from "../../define";
import { noEncontrado, prohibido, reglaDeNegocio } from "../../errores";
import { dia, hoy, pagina } from "./comun";
import { datosPanel } from "./estructuras-panel-datos";
import { entradaPanel, salidaPanel } from "./estructuras-panel-schema";
import { ocultasDe } from "./estructuras-lectura";
import { resolverVistaEfectiva } from "./estructuras-resolver-vista";
import { vistaEstructura } from "./estructuras-vista";
import { vistaInstalacion } from "./instalaciones-vista";
import { vistaPersona, vinculoVista } from "./personas-vista";
import { vistaPuesto } from "./puestos-vista";
import { resumirAlertasDocumentos } from "./resumenes";

export const estructurasPanel = defineCapability({
  id: "core.estructuras.panel",
  descripcion:
    "Carga la ficha, lista, contexto y versiones de sueldo en una lectura consolidada, con los mismos permisos y alcance que sus capacidades individuales.",
  permiso: PERMISOS_CORE.estructurasRead,
  input: entradaPanel,
  output: salidaPanel,
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => [
    ...s.vinculos.map((v) => v.id),
    ...s.aprobaciones.map((a) => a.id),
    ...(s.instalacion ? [s.instalacion.id] : []),
    ...(s.persona ? [s.persona.id] : []),
    ...s.instalaciones.items.map((i) => i.id),
    ...s.personas.items.map((p) => p.id),
    ...s.cuentas.map((c) => c.id),
    ...s.puestos.map((p) => p.id),
    ...(s.personas.cargos ?? []).map((c) => c.id),
    ...s.versiones.map((e) => e.id),
    ...s.cargosRetirados.flatMap((v) => [v.vinculoId, v.cargoId]),
    ...Object.values(s.efectiva?.niveles ?? {}).flatMap((e) => (e ? [e.id] : [])),
  ],
  async handler(ctx, input) {
    for (const permiso of [
      PERMISOS_CORE.instalacionesRead,
      ...(input.tipo === "persona"
        ? [PERMISOS_CORE.personasRead, PERMISOS_CORE.vinculosRead]
        : [PERMISOS_CORE.cuentasRead]),
    ])
      if (!ctx.autorizar(permiso)) throw prohibido("No tienes permiso para consultar este panel.");
    const panel = await datosPanel(ctx, input);
    if (!panel) throw noEncontrado("La referencia");
    const { instalacion, persona, datos } = panel;
    const vinculoVigente = persona?.vinculos.find((v) => v.estado === "vigente");
    const puesto = input.puestoId ? datos.puestos.find((p) => p.id === input.puestoId) : null;
    if (input.puestoId && !puesto) throw noEncontrado("La referencia");
    if (puesto && input.instalacionId && puesto.instalacionId !== input.instalacionId)
      throw reglaDeNegocio("El puesto no pertenece a la instalación elegida.");
    if (input.tipo === "persona" && input.instalacionId && datos._count.instalaciones === 0)
      throw noEncontrado("La referencia");
    const fecha = input.fecha ?? hoy();
    const versiones = datos.estructuras.filter(
      (e) => input.tipo === "instalacion" || e.nivel === "persona",
    );
    const vigentes = datos.estructuras.filter(
      (e) =>
        e.estado === "vigente" &&
        dia(e.vigenteDesde)! <= fecha &&
        (!e.vigenteHasta || dia(e.vigenteHasta)! >= fecha),
    );
    // Se auditan solo las versiones realmente devueltas (historial + capas efectivas).
    const reveladas = [...new Map([...versiones, ...vigentes].map((e) => [e.id, e])).values()];
    const ocultas = await ocultasDe(ctx, reveladas);
    const personas = pagina(datos.personas, 50);
    const alertas = resumirAlertasDocumentos(datos.documentoVinculos);
    return {
      vinculos: persona?.vinculos.map(vistaVinculo) ?? [],
      aprobaciones: await vistaAprobaciones(ctx, datos.aprobaciones, {
        keys: datos.apiKeys,
        miembros: datos.memberships,
      }),
      instalacion: instalacion
        ? {
            ...vistaInstalacion(instalacion, instalacion.cuenta.nombre),
            puestos: datos.puestos.map(vistaPuesto),
            documentos: datos._count.documentoVinculos,
          }
        : null,
      persona: persona
        ? {
            ...vistaPersona(persona, vinculoVigente ? vinculoVista(vinculoVigente) : null),
            documentos: datos._count.documentoVinculos,
          }
        : null,
      instalaciones: {
        items: datos.instalaciones.map((i) => ({
          ...vistaInstalacion(i, i.cuenta.nombre),
          puestos: i.puestos.length,
          dotacion: i.puestos.reduce((s, p) => s + p.dotacion, 0),
        })),
        siguiente: null,
      },
      personas: {
        items: personas.items.map((p) => ({
          ...vistaPersona(p, p.vinculos[0] ? vinculoVista(p.vinculos[0]) : null),
          documentos: alertas(p.id),
        })),
        siguiente: personas.siguiente,
        total: datos._count.personas,
        cargos: datos.cargos,
      },
      cuentas: datos.cuentas,
      puestos: datos.puestos.map(vistaPuesto),
      cargosRetirados:
        persona?.vinculos.map((v) => ({
          vinculoId: v.id,
          cargoId: v.cargoId,
          cargo: v.cargo.nombre,
          inicio: dia(v.inicio)!,
          termino: dia(v.termino),
        })) ?? [],
      versiones: versiones.map((e) => vistaEstructura(e, e.items, ocultas.get(e.id) ?? true)),
      efectiva: persona ? resolverVistaEfectiva(fecha, vigentes, ocultas) : null,
    };
  },
});
