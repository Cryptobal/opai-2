/**
 * CAR-499: la copia firmada de un documento de una persona que ella misma firmó (contrato, anexo)
 * nace visible en su portal del trabajador. El borrador sin firmar conserva su visibilidad.
 */
export function visibleParaFirmante(
  visibleEn: string[],
  propietario: { entidadTipo: string; entidadId: string } | null,
  firmantes: { personaId: string | null }[],
): string[] {
  const firmoLaPersona =
    propietario?.entidadTipo === "persona" &&
    firmantes.some((f) => f.personaId === propietario.entidadId);
  return firmoLaPersona && !visibleEn.includes("trabajador")
    ? [...visibleEn, "trabajador"]
    : visibleEn;
}
