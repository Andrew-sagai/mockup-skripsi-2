'use client';

import {
  BookOpen, Clock, Send, Inbox, Forward, ClipboardCheck,
  CheckCircle2, RotateCcw, FilePen, Stamp, PenLine,
  BadgeCheck, Hash, MailCheck, CircleAlert, Timer,
  Lock, Circle, Calendar, AlertTriangle, Upload,
  FileText, X, Eye,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Tone, StatusDef, SifatDef, HasilTenggat, JenisStatus } from '@/lib/status';
import { resolveStatus, SIFAT_DEFS, hitungTenggat } from '@/lib/status';
import type { SifatSurat } from '@/lib/types';
import { useState, useRef, useCallback, type ReactNode } from 'react';

// --- Peta ikon berdasar nama string ---
const ICON_MAP: Record<string, LucideIcon> = {
  BookOpen, Clock, Send, Inbox, Forward, ClipboardCheck,
  CheckCircle2, RotateCcw, FilePen, Stamp, PenLine,
  BadgeCheck, Hash, MailCheck, CircleAlert, Timer,
  Lock, Circle, Calendar, AlertTriangle, Upload,
  FileText, X, Eye,
};

function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Circle;
}

// ============================================================
// ChipStatus — tampilkan status surat/disposisi sebagai chip
// ============================================================
interface ChipStatusProps {
  jenis: JenisStatus;
  status: string;
  compact?: boolean;
}

const TONE_CLASSES: Record<Tone, string> = {
  netral: 'chip-netral',
  info: 'chip-info',
  segera: 'chip-segera',
  sukses: 'chip-sukses',
  bahaya: 'chip-bahaya',
};

export function ChipStatus({ jenis, status, compact }: ChipStatusProps) {
  const def = resolveStatus(jenis, status);
  const Icon = resolveIcon(def.icon);
  const cls = `chip ${TONE_CLASSES[def.tone]}${compact ? ' chip-compact' : ''}`;

  return (
    <span className={cls}>
      <Icon size={14} aria-hidden="true" />
      {!compact && <span>{def.label}</span>}
    </span>
  );
}

// ============================================================
// BadgeSifat — tampilkan sifat surat
// ============================================================
interface BadgeSifatProps {
  sifat: SifatSurat;
}

export function BadgeSifat({ sifat }: BadgeSifatProps) {
  const def: SifatDef = SIFAT_DEFS[sifat] ?? { label: sifat, tone: 'netral', icon: null };
  const cls = `chip ${TONE_CLASSES[def.tone]}`;
  const Icon = def.icon ? resolveIcon(def.icon) : null;

  return (
    <span className={cls}>
      {Icon && <Icon size={14} aria-hidden="true" />}
      <span>{def.label}</span>
    </span>
  );
}

// ============================================================
// PenandaBatasWaktu — tampilkan tenggat dengan indikator warna
// ============================================================
interface PenandaBatasWaktuProps {
  tanggal: string | Date;
  sekarang?: Date;
}

const TENGGAT_CLASSES: Record<string, string> = {
  normal: 'chip chip-netral',
  mendekati: 'chip chip-segera',
  terlambat: 'chip chip-bahaya',
};

const TENGGAT_PREFIX: Record<string, string> = {
  normal: '',
  mendekati: 'Mendekati: ',
  terlambat: 'Terlambat: ',
};

export function PenandaBatasWaktu({ tanggal, sekarang }: PenandaBatasWaktuProps) {
  const hasil = hitungTenggat(tanggal, sekarang);
  const cls = TENGGAT_CLASSES[hasil.keadaan];
  const IconComp = hasil.keadaan === 'terlambat' ? AlertTriangle : Calendar;

  return (
    <span className={cls}>
      <IconComp size={14} aria-hidden="true" />
      <span>{TENGGAT_PREFIX[hasil.keadaan]}{hasil.label}</span>
    </span>
  );
}

// ============================================================
// KonfirmasiDialog — dialog konfirmasi dengan <dialog> native
// ============================================================
interface KonfirmasiDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  judul: string;
  pesan: string | ReactNode;
  labelKonfirmasi?: string;
  labelBatal?: string;
  bahaya?: boolean;
}

export function KonfirmasiDialog({
  open,
  onClose,
  onConfirm,
  judul,
  pesan,
  labelKonfirmasi = 'Ya, Lanjutkan',
  labelBatal = 'Batal',
  bahaya = false,
}: KonfirmasiDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // sync open state with <dialog>
  if (typeof window !== 'undefined' && dialogRef.current) {
    if (open && !dialogRef.current.open) {
      dialogRef.current.showModal();
    } else if (!open && dialogRef.current.open) {
      dialogRef.current.close();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="konfirmasi-dialog"
      onClose={onClose}
      onClick={(e) => {
        // light dismiss: klik backdrop
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="konfirmasi-dialog-isi">
        <h3 className="konfirmasi-dialog-judul">{judul}</h3>
        <div className="konfirmasi-dialog-pesan">{pesan}</div>
        <div className="konfirmasi-dialog-aksi">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
          >
            {labelBatal}
          </button>
          <button
            type="button"
            className={`btn ${bahaya ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {labelKonfirmasi}
          </button>
        </div>
      </div>
    </dialog>
  );
}

// ============================================================
// UnggahPdf — kontrol unggah berkas PDF (prototipe, client-side)
// ============================================================
interface UnggahPdfProps {
  value: string | null;
  onChange: (url: string | null) => void;
  maxMB?: number;
  label?: string;
  disabled?: boolean;
}

export function UnggahPdf({
  value,
  onChange,
  maxMB = 5,
  label = 'Unggah berkas PDF',
  disabled = false,
}: UnggahPdfProps) {
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setError(null);

    if (file.type !== 'application/pdf') {
      setError('Hanya berkas PDF yang diterima.');
      return;
    }

    if (file.size > maxMB * 1024 * 1024) {
      setError(`Ukuran berkas melebihi batas ${maxMB} MB.`);
      return;
    }

    // Prototipe: pakai URL.createObjectURL
    const objectUrl = URL.createObjectURL(file);
    onChange(objectUrl);
  }, [maxMB, onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [disabled, handleFile]);

  return (
    <div className="unggah-pdf-wrapper">
      {!value ? (
        <div
          className={`unggah-pdf-drop${dragOver ? ' unggah-pdf-drop-active' : ''}${disabled ? ' unggah-pdf-disabled' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          role="button"
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
        >
          <Upload size={20} aria-hidden="true" />
          <span>{label}</span>
          <span className="unggah-pdf-hint">PDF, maks. {maxMB} MB</span>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
            hidden
          />
        </div>
      ) : (
        <div className="unggah-pdf-filled">
          <FileText size={18} aria-hidden="true" />
          <span className="unggah-pdf-name">Berkas terpilih</span>
          <a href={value} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost" title="Pratinjau">
            <Eye size={14} />
          </a>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => onChange(null)}
            disabled={disabled}
            title="Hapus berkas"
          >
            <X size={14} />
          </button>
        </div>
      )}
      {error && <p className="unggah-pdf-error">{error}</p>}
    </div>
  );
}

// ============================================================
// ModalStandar — Tahap 7: Komponen modal standar reusable
// ============================================================
import { useEffect } from 'react';
import { AlertTriangle as ModalAlertIcon, CheckCircle2 as ModalCheckIcon } from 'lucide-react';

type ModalVariant = 'konfirmasi' | 'error' | 'sukses' | 'form';
type ModalSize = 'sm' | 'md' | 'lg';

interface ModalStandarProps {
  open: boolean;
  onClose: () => void;
  judul: string;
  variant?: ModalVariant;
  size?: ModalSize;
  children: ReactNode;
  /** Footer kiri (tombol sekunder) */
  footerSecondary?: ReactNode;
  /** Footer kanan (tombol primer) */
  footerPrimary?: ReactNode;
  /** Auto-close setelah N milidetik (untuk variant sukses) */
  autoCloseMs?: number;
  loading?: boolean;
}

const MODAL_SIZE_MAP: Record<ModalSize, number> = { sm: 400, md: 540, lg: 680 };

const VARIANT_ICON: Partial<Record<ModalVariant, ReactNode>> = {
  error: <ModalAlertIcon size={22} style={{ color: '#dc2626' }} />,
  sukses: <ModalCheckIcon size={22} style={{ color: '#16a34a' }} />,
  konfirmasi: <ModalAlertIcon size={22} style={{ color: '#d97706' }} />,
};

export function ModalStandar({
  open, onClose, judul, variant = 'form', size = 'md',
  children, footerSecondary, footerPrimary, autoCloseMs, loading,
}: ModalStandarProps) {
  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Auto-close (sukses variant)
  useEffect(() => {
    if (!open || !autoCloseMs) return;
    const t = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(t);
  }, [open, autoCloseMs, onClose]);

  if (!open) return null;

  const maxW = MODAL_SIZE_MAP[size];
  const icon = VARIANT_ICON[variant];

  return (
    <div className="modal-overlay" onClick={onClose} style={{ animation: 'fadeIn 0.2s ease-out' }}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: maxW,
          width: '90vw',
          animation: 'fadeIn 0.2s ease-out',
          display: 'flex', flexDirection: 'column',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={judul}
      >
        {/* Header */}
        <div className="modal-header" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {icon}
          <h2 style={{ flex: 1, margin: 0, fontSize: 16 }}>{judul}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Tutup modal">✕</button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {children}
        </div>

        {/* Footer */}
        {(footerSecondary || footerPrimary) && (
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            {footerSecondary}
            {footerPrimary}
          </div>
        )}
      </div>
    </div>
  );
}

// Ekspor komponen pratinjau berkas PDF dan konsep surat
export { PdfViewerEmbedded } from './PdfViewerEmbedded';
export { KonsepSuratPreview } from './KonsepSuratPreview';

