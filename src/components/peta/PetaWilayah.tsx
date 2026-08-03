"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, GeoJSON } from "react-leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { Layer, PathOptions } from "leaflet";
import { useEffect, useState } from "react";
import { angka, warnaWilayah } from "@/lib/format";

export interface NilaiWilayah {
  kecamatan: string;
  jumlahWarung: number;
  terjemputLBulan: number;
  potensiLBulan: number;
  tingkatTangkap: number | null;
}

/**
 * Peta warna per kecamatan.
 *
 * Tanpa ubin peta dasar sama sekali — cuma bentuk wilayahnya di atas latar
 * polos, supaya tidak ada warna lain yang bersaing dengan warna data.
 * Kecamatan tanpa data diberi abu, BUKAN hijau termuda, karena
 * "belum ada data" berbeda dari "nol yang terukur".
 */
export function PetaWilayah({
  nilai,
  onPilih,
}: {
  nilai: NilaiWilayah[];
  onPilih?: (kecamatan: string) => void;
}) {
  const [geo, setGeo] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    fetch("/data/kecamatan.geojson")
      .then((r) => (r.ok ? r.json() : null))
      .then(setGeo)
      .catch(() => setGeo(null));
  }, []);

  const peta = new Map(nilai.map((n) => [n.kecamatan, n]));

  function gaya(f?: Feature<Geometry, { kecamatan?: string }>): PathOptions {
    const n = peta.get(f?.properties?.kecamatan ?? "");
    return {
      fillColor: warnaWilayah(n?.tingkatTangkap ?? null),
      fillOpacity: 1,
      color: "#ffffff",
      weight: 1.2,
    };
  }

  function tiapWilayah(f: Feature<Geometry, { kecamatan?: string }>, layer: Layer) {
    const nama = f.properties?.kecamatan ?? "—";
    const n = peta.get(nama);
    const isi = n?.jumlahWarung
      ? `<b>${nama}</b><br>${angka(n.jumlahWarung)} warung terdata<br>
         Terjemput ${angka(n.terjemputLBulan, 1)} L/bln<br>
         Cakupan ${angka(n.tingkatTangkap ?? 0, 1)}%`
      : `<b>${nama}</b><br><span style="color:#8a968f">Belum ada warung terdata</span>`;
    layer.bindTooltip(isi, { sticky: true });
    layer.on("click", () => onPilih?.(nama));
  }

  return (
    <div className="h-full w-full">
      <MapContainer
        center={[-6.24, 107.15]}
        zoom={10}
        zoomControl={false}
        scrollWheelZoom={false}
        attributionControl={false}
        style={{ height: "100%", width: "100%", background: "transparent" }}
      >
        {geo && (
          <GeoJSON
            key={nilai.map((n) => n.tingkatTangkap).join(",")}
            data={geo}
            style={gaya}
            onEachFeature={tiapWilayah}
          />
        )}
      </MapContainer>
    </div>
  );
}

