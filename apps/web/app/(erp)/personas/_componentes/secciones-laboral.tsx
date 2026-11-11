import { Ancla } from "./estado-seccion";
import { SeccionContactoLaboral } from "./seccion-contacto-laboral";
import { SeccionJornadaDt } from "./seccion-jornada-dt";
import { SeccionOs10 } from "./seccion-os10";
import { SeccionPago } from "./seccion-pago";
import { SeccionPinTerreno } from "./seccion-pin-terreno";
import { SeccionPrevision } from "./seccion-prevision";
import { SeccionRostro } from "./seccion-rostro";
import { SeccionUniforme } from "./seccion-uniforme";

/** Secciones de Laboral, con las anclas a las que llevan los enlaces «Ir a …» del Resumen (CAR-124). */
export function SeccionesLaboral({ personaId, nombre }: { personaId: string; nombre: string }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Ancla id="prevision">
        <SeccionPrevision personaId={personaId} />
      </Ancla>
      <Ancla id="pago">
        <SeccionPago personaId={personaId} />
      </Ancla>
      <Ancla id="uniforme">
        <SeccionUniforme personaId={personaId} />
      </Ancla>
      <Ancla id="jornada-dt">
        <SeccionJornadaDt personaId={personaId} />
      </Ancla>
      <Ancla id="os10">
        <SeccionOs10 personaId={personaId} />
      </Ancla>
      <SeccionPinTerreno personaId={personaId} nombre={nombre} />
      <SeccionRostro personaId={personaId} nombre={nombre} />
      <Ancla id="contacto">
        <SeccionContactoLaboral personaId={personaId} />
      </Ancla>
    </div>
  );
}
