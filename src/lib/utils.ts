// ============================================================
// utils.ts — Utilitas bersama
// ============================================================

/**
 * urutkanTerbaru — urutkan array secara terbaru → lama (P5).
 * @param items  Array item yang akan diurutkan (tidak dimutasi).
 * @param ambilWaktu  Fungsi yang mengembalikan timestamp (string ISO / Date / number)
 *                    dari satu item. Bila hasilnya falsy, dianggap 0 (paling lama).
 * @returns Salinan array yang sudah diurutkan terbaru di atas.
 */
export function urutkanTerbaru<T>(
  items: T[],
  ambilWaktu: (item: T) => string | Date | number | undefined | null,
): T[] {
  return [...items].sort((a, b) => {
    const tA = toMs(ambilWaktu(a));
    const tB = toMs(ambilWaktu(b));
    return tB - tA;
  });
}

function toMs(v: string | Date | number | undefined | null): number {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  return new Date(v).getTime();
}
