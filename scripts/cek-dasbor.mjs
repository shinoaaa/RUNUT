/** Membaca angka utama dari halaman dasbor yang sudah dirender. */
const r = await fetch("http://localhost:3000/dashboard", {
  headers: { Cookie: process.env.CK ?? "" },
});
const html = await r.text();
const teks = html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, "");
const b = teks.split("").map((s) => s.trim()).filter(Boolean);

const ambil = (label, n) => {
  const i = b.findIndex((x) => x === label);
  return i < 0 ? "—" : b.slice(i + 1, i + 1 + n).join(" ");
};

console.log("HTTP", r.status, "\n");
const daftar = [
  ["Tingkat Tangkap", 3],
  ["Terjemput", 3],
  ["Warung Aktif", 3],
  ["Nilai", 3],
  ["Susut Rantai", 4],
  ["Bocor di Warung Terdaftar", 4],
  ["Di Luar Jangkauan", 4],
];
for (const [l, n] of daftar) console.log(`  ${l.padEnd(27)} ${ambil(l, n)}`);

const i = b.findIndex((x) => x.includes("kecamatan belum ada data"));
if (i >= 0) console.log("\n  wilayah:", b.slice(Math.max(0, i - 2), i + 1).join(" "));
const j = b.findIndex((x) => x.includes("Liter tidak masuk"));
if (j >= 0) console.log("  dampak :", b.slice(j, j + 8).join(" | "));
