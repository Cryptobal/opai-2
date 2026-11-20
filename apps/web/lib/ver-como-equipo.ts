import type { EquipoVerComo } from "./dispositivo";
import { verificarMfaDe } from "./mfa";
import { identidadActual } from "./servidor";
import { verComoDe } from "./ver-como";

/**
 * El equipo de Terreno que se mira en «ver como» (CAR-528), o null. No empareja nada ni crea
 * credenciales: toma el equipo activo elegido al iniciar y Terreno lo usa marcado `verComo`, así que
 * toda escritura se rechaza. Cada capacidad vuelve a verificar que el equipo siga activo.
 */
export async function equipoVerComo(): Promise<EquipoVerComo | null> {
  const identidad = await identidadActual();
  const v = identidad ? await verComoDe(identidad) : null;
  if (!identidad || v?.portal !== "terreno" || !v.dispositivoId) return null;
  if (await verificarMfaDe(identidad)) return null;
  return {
    tenantId: v.tenantId,
    dispositivoId: v.dispositivoId,
    instalacionId: v.objetivoId,
    identificador: v.nombre,
    estado: "activo",
    revocadoEn: null,
    verComo: { porUserId: v.porUserId },
  };
}
