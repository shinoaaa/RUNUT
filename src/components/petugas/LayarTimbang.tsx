"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pil, Tombol, cn } from "@/components/ui";
import { angka, kg, liter, rupiah } from "@/lib/format";

export interface WarungTimbang {
  id: number;
  nama: string;
  kategori: string;
  alamat: string | null;
  kecamatan: string | null;
  lat: number;
  lon: number;
  estimasiLMinggu: number;
  qrToken: string;
  kodeSingkat: string;
}

interface Bacaan {
  gross_g: number;
  tare_g: number;
  stable_ms: number;
  battery_mv: number;
  rssi_dbm: number;
}

type Tahap = "pindai" | "timbang" | "konfirmasi" | "selesai";

export function LayarTimbang({
  warung,
  deviceId,
  petugasId,
  hargaPerKg,
}: {
  warung: WarungTimbang;
  deviceId: string;
  petugasId: number;
  hargaPerKg: number;
}) {
  const router = useRouter();
  const [tahap, setTahap] = useState<Tahap>("pindai");
  const [kodeManual, setKodeManual] = useState("");
  const [salahKode, setSalahKode] = useState(false);

  const [geser, setGeser] = useState(false);
  const [bacaan, setBacaan] = useState<Bacaan | null>(null);
  const [menimbang, setMenimbang] = useState(false);
  const [tampil, setTampil] = useState(0); // angka yang sedang bergerak saat alat stabil

  const [konfirmasi, setKonfirmasi] = useState("");
  const [kodeBenar] = useState(() => String(1000 + Math.floor(Math.random() * 8999)));
  const [mengirim, setMengirim] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [hasil, setHasil] = useState<{ beratBersihG: number; nilaiRp: number; gpsOk: boolean; jarakM: number } | null>(null);

  const jam = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (jam.current) clearInterval(jam.current); }, []);

  /* ------------------------------------------------------------
     Pemindaian stiker QR

     Pustaka pemindai hanya dimuat ketika kamera benar-benar dinyalakan.
     Ia menyentuh navigator dan MediaDevices, sehingga tidak boleh ikut
     terbawa ke bundel yang dirender di server.

     Kamera tidak dinyalakan otomatis. Petugas menekan sendiri, sebab
     peramban menuntut izin dan meminta izin tanpa diminta hanya akan
     ditolak orang. Jalur pengetikan kode tetap tersedia berdampingan
     supaya alurnya tidak pernah buntu di lapangan yang kameranya rusak,
     gelap, atau izinnya ditolak.
     ------------------------------------------------------------ */
  const WADAH_PINDAI = "wadah-pindai-qr";
  const pemindai = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const [kamera, setKamera] = useState<"mati" | "menyala" | "ditolak">("mati");
  const [galatKamera, setGalatKamera] = useState<string | null>(null);

  const hentikanKamera = useCallback(async () => {
    const p = pemindai.current;
    pemindai.current = null;
    if (!p) return;
    try {
      await p.stop();
      p.clear();
    } catch {
      // peramban kadang sudah melepas kameranya duluan; tidak apa-apa
    }
  }, []);

  useEffect(() => () => { void hentikanKamera(); }, [hentikanKamera]);

  function terimaHasilPindai(teks: string) {
    const isi = teks.trim();
    // Stiker memuat token warung. Kode enam huruf tetap diterima supaya
    // stiker lama maupun pengetikan manual sama-sama bekerja.
    const cocok =
      isi === warung.qrToken || isi.toUpperCase() === warung.kodeSingkat;

    if (!cocok) {
      setGalatKamera("Stiker ini milik warung lain. Periksa kembali alamatnya.");
      return;
    }
    setGalatKamera(null);
    void hentikanKamera();
    setKamera("mati");
    setSalahKode(false);
    setTahap("timbang");
  }

  async function nyalakanKamera() {
    setGalatKamera(null);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const alat = new Html5Qrcode(WADAH_PINDAI, { verbose: false });
      pemindai.current = alat;
      setKamera("menyala");
      await alat.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 200, height: 200 } },
        (teks) => terimaHasilPindai(teks),
        () => {
          // dipanggil tiap bingkai yang belum berisi QR — sengaja diabaikan
        },
      );
    } catch {
      pemindai.current = null;
      setKamera("ditolak");
      setGalatKamera(
        "Kamera tidak dapat dibuka. Izinnya mungkin ditolak, atau perangkat ini tidak punya kamera belakang. Masukkan kode stiker di bawah.",
      );
    }
  }

  const bersihG = bacaan ? Math.max(0, bacaan.gross_g - bacaan.tare_g) : 0;

  function periksaKode() {
    if (kodeManual.trim().toUpperCase() === warung.kodeSingkat) {
      setSalahKode(false);
      void hentikanKamera();
      setKamera("mati");
      setTahap("timbang");
    } else setSalahKode(true);
  }

  async function ambilBacaan() {
    setMenimbang(true);
    setBacaan(null);
    setTampil(0);
    const r = await fetch(`/api/alat/bacaan?warung=${warung.id}`);
    const b: Bacaan = await r.json();

    // Peragaan alat yang sedang stabil: angka bergerak lalu mengunci.
    const target = b.gross_g - b.tare_g;
    let langkah = 0;
    jam.current = setInterval(() => {
      langkah++;
      const sisa = Math.max(0, 1 - langkah / 14);
      setTampil(Math.round(target * (1 - sisa) + target * sisa * (0.75 + Math.random() * 0.5)));
      if (langkah >= 14) {
        if (jam.current) clearInterval(jam.current);
        setTampil(target);
        setBacaan(b);
        setMenimbang(false);
        setTahap("konfirmasi");
      }
    }, 90);
  }

  /**
   * Mengirim hasil timbang.
   *
   * Seluruh badannya dibungkus penjagaan galat, dan itu bukan kehati-hatian
   * berlebihan: sebelumnya kegagalan apa pun — sambungan putus, balasan
   * bukan JSON, server membalas 500 berbadan kosong — membuat tombolnya
   * terkunci pada tulisan "Mengirim…" tanpa pernah pulih. Petugas di
   * lapangan tidak punya cara keluar selain memuat ulang halaman, dan
   * timbangannya harus diulang dari awal.
   */
  async function selesai() {
    if (!bacaan || mengirim) return;
    setMengirim(true);
    setGalat(null);

    // Batas waktu supaya tidak menggantung tanpa akhir di sinyal buruk.
    const pembatal = new AbortController();
    const jamHabis = setTimeout(() => pembatal.abort(), 30_000);

    try {
    const r = await fetch("/api/simulator/kirim", {
      signal: pembatal.signal,
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        device_id: deviceId,
        type: "PICKUP",
        payload: {
          warung_id: warung.id,
          petugas_id: petugasId,
          gross_g: bacaan.gross_g,
          tare_g: bacaan.tare_g,
          lat: geser ? warung.lat + 0.0031 : warung.lat,
          lon: warung.lon,
          gps_accuracy_m: geser ? 20 : 12,
          stable_ms: bacaan.stable_ms,
          confirm_code: konfirmasi,
          qr_ok: true,
          battery_mv: bacaan.battery_mv,
          rssi_dbm: bacaan.rssi_dbm,
        },
      }),
    });

      // Balasan galat kadang berbadan kosong atau bukan JSON, sehingga
      // penguraiannya harus boleh gagal tanpa menjatuhkan seluruh alur.
      const teks = await r.text();
      let j: { balasan?: { ok?: boolean; pesan?: string } } | null = null;
      try {
        j = teks ? JSON.parse(teks) : null;
      } catch {
        j = null;
      }

      if (j?.balasan?.ok) {
        setHasil(j.balasan as never);
        setTahap("selesai");
        return;
      }

      setGalat(
        j?.balasan?.pesan ??
          (r.ok
            ? "Balasan server tidak dapat dibaca. Coba kirim ulang."
            : `Server menolak kiriman (${r.status}). Coba kirim ulang.`),
      );
    } catch (e) {
      setGalat(
        (e as Error)?.name === "AbortError"
          ? "Pengiriman melebihi 30 detik. Periksa sinyal, lalu coba kirim ulang."
          : "Tidak dapat menghubungi server. Periksa sambungan, lalu coba kirim ulang.",
      );
    } finally {
      // Apa pun yang terjadi, tombolnya harus bisa ditekan lagi.
      clearTimeout(jamHabis);
      setMengirim(false);
    }
  }

  /* ------------------------------------------------------------ */

  if (tahap === "selesai" && hasil) {
    return (
      <div className="flex min-h-dvh flex-col">
        <header className="bg-brand px-4 py-5 text-white sm:rounded-t-card">
          <p className="text-[13px] text-white/70">Penjemputan tercatat</p>
          <h1 className="mt-0.5 text-[21px] font-bold leading-tight">{warung.nama}</h1>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
          <div className="grid size-14 place-items-center rounded-full bg-ok-bg text-2xl text-ok">✓</div>
          <p className="tabular text-[44px] font-bold leading-none">
            {liter(hasil.beratBersihG)}{" "}
            <span className="text-lg font-medium text-ink-2">liter</span>
          </p>
          <p className="tabular -mt-2 text-[13px] text-ink-3">
            {kg(hasil.beratBersihG)} kg terukur alat
          </p>
          <p className="text-ink-2">
            {rupiah(hasil.nilaiRp)} dibayarkan ke warung
          </p>
          <Pil nada={hasil.gpsOk ? "ok" : "warn"} titik>
            {hasil.gpsOk ? `Lokasi cocok · ${hasil.jarakM} m` : `Lokasi meleset ${hasil.jarakM} m`}
          </Pil>
          <p className="mt-2 max-w-xs text-[12px] text-ink-3">
            Bacaan dikirim dan ditandatangani oleh alat {deviceId}, lalu disambung
            ke rantai bukti.
          </p>
        </div>
        <div className="border-t border-line bg-surface p-4 sm:rounded-b-card">
          <Tombol besar className="w-full" onClick={() => router.push("/petugas")}>
            Lanjut ke kunjungan berikutnya
          </Tombol>
        </div>
      </div>
    );
  }

  const terkunci = tahap === "pindai";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-3 bg-brand px-4 py-3.5 text-white sm:rounded-t-card">
        <Link href="/petugas" aria-label="Kembali" className="text-white/80 hover:text-white">
          ←
        </Link>
        <span className="font-medium">Penjemputan</span>
        <span className="ml-auto text-right text-[11px] leading-tight text-white/65">
          Alat {deviceId}
          <br />
          {bacaan ? `${(bacaan.battery_mv / 1000).toFixed(2)} V · ${bacaan.rssi_dbm} dBm` : "siap"}
        </span>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* identitas warung */}
        <section className="rounded-card border border-line bg-surface p-4">
          <h1 className="text-[19px] font-semibold leading-snug">{warung.nama}</h1>
          <p className="mt-1 text-[13px] text-ink-2">
            {warung.alamat ?? "Alamat belum tercatat"}
            {warung.kecamatan && ` · ${warung.kecamatan}`}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <Pil nada="netral">{warung.kategori}</Pil>
            <Pil nada="info">Estimasi {angka(warung.estimasiLMinggu, 1)} L/minggu</Pil>
          </div>
        </section>

        {/* pindai QR */}
        <section className="rounded-card border border-line bg-surface p-4">
          {tahap === "pindai" ? (
            <>
              <p className="text-[13px] font-medium">Pindai stiker QR di warung</p>

              {/* Wadah pemindai selalu ada di pohon DOM karena pustakanya
                  memasang video ke dalamnya berdasarkan id. Yang berubah
                  hanya kelihatan atau tidaknya. */}
              <div
                id={WADAH_PINDAI}
                className={cn(
                  "mt-3 overflow-hidden rounded-card",
                  kamera === "menyala" ? "block border border-line" : "hidden",
                )}
              />

              {kamera !== "menyala" && (
                <div className="mt-3 grid aspect-square w-full place-items-center rounded-card border-2 border-dashed border-line bg-canvas text-center">
                  <div className="px-6">
                    <p className="text-sm text-ink-2">Arahkan kamera ke stiker</p>
                    <p className="mt-1 text-[12px] text-ink-3">
                      Kode pada stiker juga bisa dimasukkan manual di bawah
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-3">
                {kamera === "menyala" ? (
                  <Tombol
                    nada="kedua"
                    className="w-full"
                    onClick={() => {
                      void hentikanKamera();
                      setKamera("mati");
                    }}
                  >
                    Matikan kamera
                  </Tombol>
                ) : (
                  <Tombol nada="kedua" className="w-full" onClick={nyalakanKamera}>
                    {kamera === "ditolak" ? "Coba nyalakan kamera lagi" : "Nyalakan kamera"}
                  </Tombol>
                )}
              </div>

              {galatKamera && (
                <p className="mt-2 rounded-btn bg-warn-bg px-3 py-2 text-[12px] text-warn">
                  {galatKamera}
                </p>
              )}

              <p className="mt-3 text-[12px] text-ink-3">
                Tidak ada kamera? Masukkan kode yang tertera di stiker.
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  value={kodeManual}
                  onChange={(e) => {
                    setKodeManual(e.target.value);
                    setSalahKode(false);
                  }}
                  placeholder={warung.kodeSingkat}
                  className="h-10 w-full rounded-input border border-line bg-surface px-3 font-mono text-sm uppercase"
                />
                <Tombol onClick={periksaKode}>Buka</Tombol>
              </div>
              {salahKode && (
                <p className="mt-2 text-[13px] text-danger">Kode tidak cocok dengan warung ini.</p>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-1.5">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-ok">
                ✓ Warung terverifikasi
              </span>
              <span className="inline-flex items-center gap-2 text-[13px]">
                <span
                  className={cn("size-2 rounded-full", geser ? "bg-warn" : "bg-ok")}
                />
                {geser ? "Lokasi meleset ± 340 m" : "Lokasi cocok · 12 m"}
              </span>
              <label className="mt-1 flex items-center gap-2 text-[12px] text-ink-3">
                <input
                  type="checkbox"
                  checked={geser}
                  onChange={(e) => setGeser(e.target.checked)}
                />
                Geser GPS untuk memperagakan penandaan anomali
              </label>
            </div>
          )}
        </section>

        {/* panel timbangan */}
        <section
          className={cn(
            "rounded-card border border-line bg-surface p-4 transition-opacity",
            terkunci && "pointer-events-none opacity-40",
          )}
        >
          {terkunci && (
            <p className="mb-3 text-[12px] text-ink-3">
              🔒 Terkunci sampai QR warung dipindai
            </p>
          )}

          <div className="flex justify-between text-[13px] text-ink-2">
            <span>Kotor</span>
            <span className="tabular">{bacaan ? `${angka(bacaan.gross_g)} g` : "—"}</span>
          </div>
          <div className="mt-1 flex justify-between text-[13px] text-ink-2">
            <span>Wadah</span>
            <span className="tabular">{bacaan ? `${angka(bacaan.tare_g)} g` : "—"}</span>
          </div>

          <div className="my-3 border-t border-line" />

          <div className="text-center">
            <p className="text-[11px] uppercase tracking-[0.08em] text-ink-3">Bersih</p>
            <p className="tabular mt-1 text-[52px] font-bold leading-none">
              {liter(menimbang ? tampil : bersihG)}
              <span className="ml-1 text-xl font-medium text-ink-2">liter</span>
            </p>
            {bacaan && (
              <p className="mt-1.5 text-[13px] text-ink-2">
                {kg(bersihG)} kg terukur alat ·{" "}
                {rupiah(Math.round((bersihG / 1000) * hargaPerKg))}
              </p>
            )}
          </div>

          {bacaan ? (
            <p className="mt-3 rounded-btn bg-accent-soft px-3 py-2 text-center text-[12px] text-accent">
              🔒 Angka dikirim langsung oleh alat · stabil {bacaan.stable_ms} ms
            </p>
          ) : (
            <Tombol
              besar
              className="mt-4 w-full"
              disabled={menimbang || terkunci}
              onClick={ambilBacaan}
            >
              {menimbang ? "Menunggu alat stabil…" : "Ambil bacaan dari alat"}
            </Tombol>
          )}

          <p className="mt-3 text-center text-[11px] text-ink-3">
            Layar ini tidak punya kolom isian bobot. Angka hanya bisa datang dari timbangan.
          </p>
        </section>

        {/* konfirmasi pemilik */}
        {tahap === "konfirmasi" && (
          <section className="rounded-card border border-line bg-surface p-4">
            <p className="text-[13px] font-medium">Konfirmasi pemilik warung</p>
            <p className="mt-1 text-[12px] text-ink-3">
              Pemilik memasukkan kode agar bobot yang tercatat disetujui kedua pihak.
              Kode terkirim ke nomor pemilik: <b className="tabular">{kodeBenar}</b>
            </p>
            <input
              value={konfirmasi}
              onChange={(e) => setKonfirmasi(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              placeholder="••••"
              className="tabular mt-3 h-14 w-full rounded-input border border-line bg-surface text-center text-2xl tracking-[0.5em]"
            />
          </section>
        )}

        {galat && (
          <p className="rounded-btn bg-danger-bg px-3 py-2 text-[13px] text-danger">{galat}</p>
        )}
      </div>

      <div className="sticky bottom-0 border-t border-line bg-surface p-4 sm:rounded-b-card">
        <Tombol
          besar
          className="w-full"
          disabled={tahap !== "konfirmasi" || konfirmasi.length !== 4 || mengirim}
          onClick={selesai}
        >
          {mengirim ? "Mengirim…" : bacaan ? `Selesai · ${liter(bersihG)} liter` : "Selesai"}
        </Tombol>
        <Link
          href="/petugas"
          className="mt-2 block text-center text-[13px] text-ink-3 underline underline-offset-4"
        >
          Lewati kunjungan ini
        </Link>
      </div>
    </div>
  );
}
