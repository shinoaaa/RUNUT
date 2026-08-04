"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, GeoJSON, useMapEvents } from "react-leaflet";
import type { GeoJsonObject } from "geojson";
import { useEffect, useState } from "react";

function Penangkap({ onKlik }: { onKlik: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onKlik(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Peta kecil untuk menaruh satu titik dengan mengklik. */
export function PetaPilihTitik({
  lat,
  lon,
  onPilih,
}: {
  lat: number | null;
  lon: number | null;
  onPilih: (lat: number, lon: number) => void;
}) {
  const [batas, setBatas] = useState<GeoJsonObject | null>(null);

  useEffect(() => {
    fetch("/data/kab-bekasi.geojson")
      .then((r) => (r.ok ? r.json() : null))
      .then(setBatas)
      .catch(() => setBatas(null));
  }, []);

  return (
    <div className="peta-kelabu h-full w-full">
      <MapContainer
        center={[lat ?? -6.3, lon ?? 107.13]}
        zoom={11}
        scrollWheelZoom
        preferCanvas
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {batas && (
          <GeoJSON
            data={batas}
            style={{ color: "#0e4f3f", weight: 1.5, fill: false, dashArray: "4 3" }}
          />
        )}
        <Penangkap onKlik={onPilih} />
        {lat !== null && lon !== null && (
          <CircleMarker
            center={[lat, lon]}
            radius={9}
            pathOptions={{
              color: "#16211c",
              weight: 2,
              fillColor: "#1f9d6e",
              fillOpacity: 0.9,
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
