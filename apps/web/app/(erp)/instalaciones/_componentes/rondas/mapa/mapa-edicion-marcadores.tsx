import { Circle, Marker } from "react-leaflet";

import { iconoPuntoEditable } from "./iconos";

export function MarcadoresEdicionPunto({
  punto,
  radioM,
  fijar,
}: {
  punto: { lat: number; lng: number };
  radioM: number;
  fijar: (lat: number, lng: number) => void;
}) {
  return (
    <>
      <Marker
        position={[punto.lat, punto.lng]}
        icon={iconoPuntoEditable()}
        draggable
        eventHandlers={{
          dragend: (e) => {
            const { lat, lng } = e.target.getLatLng();
            fijar(lat, lng);
          },
        }}
      />
      <Circle
        center={[punto.lat, punto.lng]}
        radius={radioM}
        pathOptions={{
          color: "var(--color-accent)",
          fillColor: "var(--color-accent)",
          fillOpacity: 0.12,
        }}
      />
    </>
  );
}