/**
 * reminders.ts — Simulasi sistem notifikasi reminder & overdue client-side
 *
 * Dipanggil setiap kali DashboardLayout mount atau user berpindah halaman.
 * Mengecek disposisi yang mendekati atau melewati tenggat dan mengirim
 * notifikasi in-app ke penanggung jawab + eskalasi ke atasan.
 *
 * CATATAN (untuk skripsi & tim pengembang):
 * Ini adalah implementasi simulasi untuk tahap PILOT/MOCKUP.
 * Di tahap produksi sungguhan, mekanisme ini harus diganti dengan:
 * - Scheduled function / cron job di backend (misal: Supabase Edge Functions,
 *   Vercel Cron, atau Node.js worker process)
 * - Pengiriman email/WhatsApp via layanan pihak ketiga (Nodemailer, Twilio, dll)
 * - Field reminderSentAt / overdueSentAt disimpan di database agar konsisten
 *   lintas server dan tidak tergantung pada sesi browser tertentu
 * Referensi: Proposal poin 13(d)(e), Bab 4 subbab Notifikasi Otomatis.
 */

import { AppState, Disposisi, Notifikasi } from './types';

/** Batas waktu (jam) untuk mengirim reminder sebelum tenggat */
const REMINDER_HOURS_BEFORE = 24;
/** Minimum interval (jam) antar notifikasi sejenis untuk disposisi yang sama */
const MIN_NOTIF_INTERVAL_HOURS = 12;

function nowIso(): string {
  return new Date().toISOString();
}

function hoursDiff(fromIso: string, toIso: string): number {
  return (new Date(toIso).getTime() - new Date(fromIso).getTime()) / (1000 * 60 * 60);
}

export interface ReminderResult {
  /** Dispatch UPDATE_DISPOSISI untuk tandai reminderSentAt / overdueSentAt */
  updatedDisposisi: { id: string; reminderSentAt?: string; overdueSentAt?: string }[];
  /** Notifikasi baru yang harus di-dispatch ADD_NOTIFIKASI */
  newNotifikasi: Omit<Notifikasi, 'id'>[];
}

/**
 * checkRemindersAndOverdue — Periksa semua disposisi aktif dan hasilkan
 * notifikasi reminder/overdue yang belum pernah dikirim (atau sudah kedaluwarsa).
 *
 * @param state AppState saat ini (read-only)
 * @returns ReminderResult — list dispatch yang perlu dilakukan
 */
export function checkRemindersAndOverdue(state: AppState): ReminderResult {
  const now = new Date();
  const nowStr = now.toISOString();
  const updatedDisposisi: ReminderResult['updatedDisposisi'] = [];
  const newNotifikasi: ReminderResult['newNotifikasi'] = [];

  const generateN = (userId: string, judul: string, pesan: string, url: string): Omit<Notifikasi, 'id'> => ({
    userId, judul, pesan, tautanUrl: url, dibaca: false, createdAt: nowStr,
  });

  for (const disp of state.disposisi) {
    // Skip disposisi yang sudah selesai atau belum punya tenggat
    if (disp.status === 'selesai' || !disp.tenggat) continue;

    const sm = state.suratMasuk.find(s => s.id === disp.suratMasukId);
    const sifatSurat = disp.sifat || sm?.sifat;
    const isPrioritas = sifatSurat === 'segera' || sifatSurat === 'penting';
    const tenggatDate = new Date(disp.tenggat);
    const hoursUntilDeadline = (tenggatDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    const isOverdue = hoursUntilDeadline < 0;
    const isApproachingDeadline = !isOverdue && hoursUntilDeadline <= REMINDER_HOURS_BEFORE;

    // ── Tentukan penanggung jawab saat ini ──────────────────
    // Jika sudah diteruskan ke staf → staf yang punya penugasan aktif
    // Jika belum → kepala bidang tujuan (tiap bidang)
    const activeAssignments = state.penugasan.filter(
      p => p.disposisiId === disp.id && p.status !== 'selesai'
    );

    const url = `/disposisi/${disp.id}`;
    const suratLabel = sm ? `"${sm.perihal.slice(0, 50)}"` : `(ID: ${disp.id})`;
    const tenggatLabel = tenggatDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    // ── REMINDER (mendekati tenggat, hanya surat prioritas) ─
    if (isApproachingDeadline && isPrioritas) {
      const alreadySent = disp.reminderSentAt &&
        hoursDiff(disp.reminderSentAt, nowStr) < MIN_NOTIF_INTERVAL_HOURS;
      if (!alreadySent) {
        if (activeAssignments.length > 0) {
          // Staf pelaksana aktif
          for (const penugasan of activeAssignments) {
            newNotifikasi.push(generateN(
              penugasan.stafId,
              `⚠️ Reminder: Tenggat Mendekat`,
              `Surat ${suratLabel} perlu diselesaikan sebelum ${tenggatLabel} (${Math.round(hoursUntilDeadline)} jam lagi).`,
              url
            ));
          }
        } else {
          // Kabid yang belum menerima atau belum meneruskan
          for (const bidang of disp.bidangTujuan) {
            const kabid = state.users.find(u =>
              u.role === 'kepala_bidang' && u.unitKerjaId === bidang.unitKerjaId
            );
            if (kabid) {
              newNotifikasi.push(generateN(
                kabid.id,
                `⚠️ Reminder: Tenggat Mendekat`,
                `Disposisi surat ${suratLabel} mendekati tenggat (${tenggatLabel}). Segera tindaklanjuti.`,
                url
              ));
            }
          }
        }
        updatedDisposisi.push({ id: disp.id, reminderSentAt: nowStr });
      }
    }

    // ── OVERDUE + ESKALASI ──────────────────────────────────
    if (isOverdue) {
      const alreadySent = disp.overdueSentAt &&
        hoursDiff(disp.overdueSentAt, nowStr) < MIN_NOTIF_INTERVAL_HOURS;
      if (!alreadySent) {
        const overdueDays = Math.round(Math.abs(hoursUntilDeadline) / 24);

        if (activeAssignments.length > 0) {
          // Kirim ke staf yang terlambat + eskalasi ke kabid mereka
          for (const penugasan of activeAssignments) {
            // Notif ke staf
            newNotifikasi.push(generateN(
              penugasan.stafId,
              `🔴 TERLAMBAT: Surat Melewati Tenggat`,
              `Laporan untuk surat ${suratLabel} sudah terlambat ${overdueDays} hari. Segera kirimkan laporan!`,
              url
            ));
            // Eskalasi ke kabid (Proposal 13e)
            newNotifikasi.push(generateN(
              penugasan.kepalaBidangId,
              `🔴 Eskalasi: Staf Terlambat`,
              `Penugasan staf untuk surat ${suratLabel} telah melewati tenggat ${overdueDays} hari. Tindakan diperlukan.`,
              url
            ));
          }
        } else {
          // Kabid belum tindaklanjut → eskalasi ke Kadis (Proposal 13e)
          for (const bidang of disp.bidangTujuan) {
            const kabid = state.users.find(u =>
              u.role === 'kepala_bidang' && u.unitKerjaId === bidang.unitKerjaId
            );
            if (kabid) {
              newNotifikasi.push(generateN(
                kabid.id,
                `🔴 TERLAMBAT: Disposisi Belum Ditindaklanjuti`,
                `Disposisi surat ${suratLabel} telah melewati tenggat ${overdueDays} hari tanpa tindak lanjut!`,
                url
              ));
            }
          }
          // Eskalasi ke Kadis
          const kadis = state.users.find(u => u.role === 'kepala_dinas');
          if (kadis) {
            newNotifikasi.push(generateN(
              kadis.id,
              `🔴 Eskalasi Keterlambatan Disposisi`,
              `Surat ${suratLabel} telah melewati tenggat ${overdueDays} hari tanpa penyelesaian dari bidang terkait.`,
              url
            ));
          }
        }
        updatedDisposisi.push({ id: disp.id, overdueSentAt: nowStr });
      }
    }
  }

  return { updatedDisposisi, newNotifikasi };
}
