"use client";

import { useRef, useState } from "react";
import { Panel, Pil, Tombol, cn } from "@/components/ui";
import { angka, rupiah } from "@/lib/format";

export interface PilihanAlat {
  deviceId: string;
  petugasId: number | null;
  petugasNama: string | null;
  lastSeq: number;
}
export interface PilihanWarung {
  id: number;
  nama: string;
  lat: number;
  lon: number;
  kecamatan: string | null;
}

type Baris = {
  waktu: string;
  ok: boolean;
  judul: string;
  rinci: string;
  catatan?: string[];
};

interface Balasan {
  ok?: boolean;
  duplikat?: boolean;
  pesan?: string;
  catatan?: string[];
  beratBersihG?: number;
  nilaiRp?: number;
  gpsOk?: boolean;
  jarakM?: number;
  susutG?: number;
  susutPersen?: number;
}

interface HasilKirim {
  status?: number;
  keterangan?: string;
  balasan?: Balasan;
}

export function Simulator({
  alat,
  warung,
  tripBerjalan,
  titikKumpulId,
}: {
  alat: PilihanAlat[];
  warung: PilihanWarung[];
  tripBerjalan: { id: number; totalGWarung: number } | null;
  titikKumpulId: number | null;
}) {
  const [deviceId, setDeviceId] = useState(alat[0]?.deviceId ?? "");
  const [warungId, setWarungId] = useState(warung[0]?.id ?? 0);
  const [gross, setGross] = useState(9240);
  const [tare, setTare] = useState(1180);
  const [geser, setGeser] = useState(false);
  const [log, setLog] = useState<Baris[]>([]);
  const [sibuk, setSibuk] = useState(false);
  const berhenti = useRef(false);

  const alatTerpilih = alat.find((a) => a.deviceId === deviceId);
  const w = warung.find((x) => x.id === warungId);
  const bersih = Math.max(0, gross - tare);

  function catat(judul: string, hasil: HasilKirim, keterangan?: string) {
    const b: Balasan = hasil?.balasan ?? {};
    const ok = Boolean(hasil?.status === 200 && b?.ok && !b?.duplikat);
    const rinci = b?.duplikat
      ? "Ditolak sebagai duplikat"
      : b?.pesan
        ? b.pesan
        : b?.beratBersihG !== undefined
          ? `${angka(b.beratBersihG / 1000, 2)} kg · ${rupiah(b.nilaiRp ?? 0)} · GPS ${b.gpsOk ? "cocok" : `meleset ${b.jarakM} m`}`
          : b?.susutG !== undefined
            ? `Susut ${angka(b.susutG)} g (${angka(b.susutPersen ?? 0, 2)}%)`
            : `HTTP ${hasil?.status}`;
    setLog((L) =>
      [
        {
          waktu: new Date().toLocaleTimeString("id-ID"),
          ok,
          judul: keterangan ? `${judul} — ${keterangan}` : judul,
          rinci,
          catatan: b?.catatan,
        },
        ...L,
      ].slice(0, 60),
    );
  }

  async function kirim(
    type: "PICKUP" | "DROPOFF",
    payload: Record<string, unknown>,
    nakal?: string,
    judul = "Kirim",
  ) {
    const r = await fetch("/api/simulator/kirim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ device_id: deviceId, type, payload, nakal }),
    });
    const hasil = await r.json();
    catat(judul, hasil, hasil?.keterangan);
    return hasil;
  }

  function muatanPickup(target = w, beratKotor = gross) {
    if (!target) return null;
    return {
      warung_id: target.id,
      petugas_id: alatTerpilih?.petugasId,
      gross_g: beratKotor,
      tare_g: tare,
      lat: geser ? target.lat + 0.0027 : target.lat,
      lon: target.lon,
      gps_accuracy_m: geser ? 18 : 11,
      stable_ms: 1400,
      confirm_code: String(1000 + Math.floor(Math.random() * 8999)),
      qr_ok: true,
      battery_mv: 3700 + Math.floor(Math.random() * 200),
      rssi_dbm: -70 - Math.floor(Math.random() * 25),
    };
  }

  async function jalankanTrip() {
    setSibuk(true);
    berhenti.current = false;
    const acak = [...warung].sort(() => Math.random() - 0.5).slice(0, 12);
    for (const t of acak) {
      if (berhenti.current) break;
      const kotor = 3000 + Math.floor(Math.random() * 12000);
      await kirim("PICKUP", muatanPickup(t, kotor)!, undefined, `Jemput ${t.nama}`);
      await new Promise((r) => setTimeout(r, 900));
    }
    setSibuk(false);
  }

  const kelasKotak =
    "h-9 w-full rounded-input border border-line bg-surface px-2.5 text-sm";

  return (
    <div className="px-5 py-6 lg:px-8">
      <header className="mb-5">
        <h1 className="text-[26px] font-bold leading-tight">Simulator Timbangan</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-2">
          Halaman ini berperan sebagai perangkat keras. Muatan ditandatangani dengan
          kunci privat alat lalu dikirim ke <code className="text-[13px]">/api/ingest</code>{" "}
          lewat jalur yang sama persis dengan alat sungguhan.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_1fr]">
        <div className="flex flex-col gap-4">
          <Panel judul="Alat & sasaran">
            <div className="grid gap-3">
              <label className="grid gap-1.5">
                <span className="text-[12px] font-medium text-ink-2">Perangkat</span>
                <select
                  className={kelasKotak}
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                >
                  {alat.map((a) => (
                    <option key={a.deviceId} value={a.deviceId}>
                      {a.deviceId} — {a.petugasNama ?? "tanpa petugas"} (seq {a.lastSeq})
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5">
                <span className="text-[12px] font-medium text-ink-2">Warung</span>
                <select
                  className={kelasKotak}
                  value={warungId}
                  onChange={(e) => setWarungId(Number(e.target.value))}
                >
                  {warung.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.nama} {x.kecamatan ? `· ${x.kecamatan}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5">
                  <span className="text-[12px] font-medium text-ink-2">Kotor (g)</span>
                  <input
                    type="number"
                    className={cn(kelasKotak, "tabular")}
                    value={gross}
                    onChange={(e) => setGross(Number(e.target.value))}
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-[12px] font-medium text-ink-2">Wadah (g)</span>
                  <input
                    type="number"
                    className={cn(kelasKotak, "tabular")}
                    value={tare}
                    onChange={(e) => setTare(Number(e.target.value))}
                  />
                </label>
              </div>

              <div className="rounded-card border border-line bg-canvas px-4 py-3 text-center">
                <p className="text-[11px] uppercase tracking-[0.08em] text-ink-3">Bersih</p>
                <p className="tabular text-[34px] font-bold leading-none">
                  {angka(bersih / 1000, 2)}{" "}
                  <span className="text-base font-medium text-ink-2">kg</span>
                </p>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={geser}
                  onChange={(e) => setGeser(e.target.checked)}
                />
                Geser GPS ±300 m dari lokasi warung
              </label>

              <Tombol besar disabled={!w || sibuk} onClick={() => kirim("PICKUP", muatanPickup()!)}>
                Kirim penimbangan
              </Tombol>
            </div>
          </Panel>

          <Panel judul="Peragaan penolakan">
            <p className="mb-3 text-[13px] text-ink-2">
              Tiga tombol ini sengaja mengirim data cacat. Sistem harus menolak atau
              menandainya — itulah buktinya rantai bukti bekerja.
            </p>
            <div className="grid gap-2">
              <Tombol
                nada="kedua"
                disabled={sibuk}
                onClick={() => kirim("PICKUP", muatanPickup()!, "ulang", "Kirim ulang")}
              >
                Kirim ulang kejadian yang sama
              </Tombol>
              <Tombol
                nada="kedua"
                disabled={sibuk}
                onClick={() =>
                  kirim("PICKUP", muatanPickup()!, "tanda_tangan_palsu", "Tanda tangan palsu")
                }
              >
                Palsukan tanda tangan
              </Tombol>
              <Tombol
                nada="kedua"
                disabled={sibuk}
                onClick={() => kirim("PICKUP", muatanPickup()!, "lewati_urut", "Lewati nomor urut")}
              >
                Lewati nomor urut
              </Tombol>
              <Tombol
                nada="kedua"
                disabled={sibuk}
                onClick={() => kirim("PICKUP", muatanPickup()!, "rantai_putus", "Rantai putus")}
              >
                Rusak sambungan rantai
              </Tombol>
            </div>
          </Panel>

          <Panel judul="Trip otomatis">
            <p className="mb-3 text-[13px] text-ink-2">
              Menjemput 12 warung acak berurutan. Buka dasbor di tab lain untuk melihat
              angkanya bergerak.
            </p>
            <div className="flex gap-2">
              <Tombol disabled={sibuk} onClick={jalankanTrip}>
                {sibuk ? "Berjalan…" : "Jalankan trip otomatis"}
              </Tombol>
              {sibuk && (
                <Tombol nada="kedua" onClick={() => (berhenti.current = true)}>
                  Hentikan
                </Tombol>
              )}
            </div>
            {tripBerjalan && (
              <p className="mt-3 text-[13px] text-ink-2">
                Trip #{tripBerjalan.id} sedang berjalan, terkumpul{" "}
                <span className="tabular font-medium">
                  {angka(tripBerjalan.totalGWarung / 1000, 2)} kg
                </span>
                .{" "}
                <button
                  className="text-accent underline underline-offset-4"
                  disabled={sibuk}
                  onClick={() =>
                    kirim(
                      "DROPOFF",
                      {
                        trip_id: tripBerjalan.id,
                        titik_kumpul_id: titikKumpulId,
                        gross_g: tripBerjalan.totalGWarung + 5000 - 300,
                        tare_g: 5000,
                      },
                      undefined,
                      "Setor ke titik kumpul",
                    )
                  }
                >
                  Setor ke titik kumpul
                </button>
              </p>
            )}
          </Panel>
        </div>

        <Panel judul="Log kejadian" aksi={<Pil nada="netral">{log.length}</Pil>} padat>
          <div className="max-h-[640px] overflow-y-auto">
            {log.length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-ink-3">
                Belum ada kejadian. Tekan salah satu tombol di sebelah kiri.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {log.map((b, i) => (
                  <li key={i} className="flex gap-3 px-5 py-3">
                    <span
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        b.ok ? "bg-ok" : "bg-danger",
                      )}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{b.judul}</p>
                      <p className="text-[13px] text-ink-2">{b.rinci}</p>
                      {b.catatan?.map((c) => (
                        <p key={c} className="mt-1 text-[12px] text-warn">
                          {c}
                        </p>
                      ))}
                    </div>
                    <span className="tabular ml-auto shrink-0 text-[12px] text-ink-3">
                      {b.waktu}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
