"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Tooltip, GeoJSON } from "react-leaflet";
import type { GeoJsonObject } from "geojson";
import { useEffect, useState } from "react";
import { LABEL_STATUS, WARNA_STATUS, angka } from "@/lib/format";
import type { TitikWarung } from "./tipe";

export function PetaWarung({
  titik,
  terpilih,
  onPilih,
  tinggi = "100%",
}: {
  titik: TitikWarung[];
  terpilih?: number | null;
  onPilih?: (id: number) => void;
  tinggi?: string;
}) {
  const [batas, setBatas] = useState<GeoJsonObject | null>(null);

  useEffect(() => {
    fetch("/data/kab-bekasi.geojson")
      .then((r) => (r.ok ? r.json() : null))
      .then(setBatas)
      .catch(() => setBatas(null));
  }, []);

  return (
    <div className="peta-kelabu h-full w-full" style={{ height: tinggi }}>
      <MapContainer
        center={[-6.28, 107.13]}
        zoom={11}
        scrollWheelZoom
        preferCanvas
        className="h-full w-full"
        style={{ height: tinggi }}
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

        {titik.map((t) => {
          const aktif = terpilih === t.id;
          return (
            <CircleMarker
              key={t.id}
              center={[t.lat, t.lon]}
              radius={aktif ? 9 : 5}
              pathOptions={{
                color: aktif ? "#16211c" : WARNA_STATUS[t.status],
                weight: aktif ? 2 : 1,
                fillColor: WARNA_STATUS[t.status],
                fillOpacity: 0.85,
              }}
              eventHandlers={{ click: () => onPilih?.(t.id) }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                <div className="min-w-40">
                  <p className="font-semibold">{t.nama}</p>
                  <p className="text-ink-3">
                    {t.kategori} · {t.kecamatan ?? "kecamatan belum diketahui"}
                  </p>
                  <p className="mt-1">
                    Estimasi {angka(t.estimasiLBulan, 1)} L/bln · Terjemput{" "}
                    {angka(t.terjemputLBulan, 1)} L/bln
                  </p>
                  <p style={{ color: WARNA_STATUS[t.status] }}>{LABEL_STATUS[t.status]}</p>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
