export const BATAS_MENDEKATI_HARI: number | null = null;

export type BatasWaktuState = 'normal' | 'mendekati' | 'terlambat' | 'selesai';

export function getBatasWaktuState(batasWaktu: string | undefined | null, status: string, hariIni: Date = new Date()): BatasWaktuState {
  if (status === 'selesai') return 'selesai';
  if (!batasWaktu) return 'normal';
  
  const batas = new Date(batasWaktu);
  batas.setHours(23, 59, 59, 999); // Akhir hari
  
  const sisa = batas.getTime() - hariIni.getTime();
  const sisaHari = sisa / (1000 * 60 * 60 * 24);
  
  if (sisaHari < 0) return 'terlambat';
  if (BATAS_MENDEKATI_HARI !== null && sisaHari <= BATAS_MENDEKATI_HARI) return 'mendekati';
  
  return 'normal';
}
