import React, { useState } from 'react';
import {
  Mail,
  Plus,
  Check,
  X,
  Sparkles,
  Trash2,
  AlertCircle,
  Database,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { MailboxItem, User } from '../types';

interface MailboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  domain: string;
  user: User;
  activeMailbox: string;
  mailboxes: MailboxItem[];
  foundMailboxes: string[];
  onSelectMailbox: (mailbox: string) => void;
  onMailboxesUpdated: (newMailboxes: MailboxItem[], newActiveHandle?: string) => void;
  supabaseConnected?: boolean;
}

export const MailboxModal: React.FC<MailboxModalProps> = ({
  isOpen,
  onClose,
  domain,
  user,
  activeMailbox,
  mailboxes,
  foundMailboxes,
  onSelectMailbox,
  onMailboxesUpdated,
  supabaseConnected = false,
}) => {
  const [handleInput, setHandleInput] = useState('');
  const [inputError, setInputError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSqlSchemaModal, setShowSqlSchemaModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;

  const currentCount = mailboxes.length;
  const maxLimit = 10;
  const isLimitReached = currentCount >= maxLimit;

  const handleApplyNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setInputError('');
    setSuccessMessage('');

    const clean = handleInput.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    if (!clean || clean.length < 2) {
      setInputError('Nama mailbox minimal 2 karakter (hanya huruf, angka, titik, strip)');
      return;
    }

    if (isLimitReached) {
      setInputError('Batas maksimal 10 mailbox per akun telah tercapai. Hapus salah satu mailbox lama jika ingin menambah baru.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/user/mailboxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          handle: clean,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menambahkan mailbox');
      }

      const updated = [...mailboxes, data.mailbox];
      onMailboxesUpdated(updated, clean);
      setSuccessMessage(`Berhasil menambahkan ${data.mailbox.full_email}`);
      setHandleInput('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem';
      setInputError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMailbox = async (handleToDelete: string) => {
    if (mailboxes.length <= 1) {
      setInputError('Anda harus memiliki minimal 1 mailbox aktif.');
      return;
    }

    const confirm = window.confirm(`Apakah Anda yakin ingin menghapus mailbox "${handleToDelete}@${domain}"?`);
    if (!confirm) return;

    setInputError('');
    setSuccessMessage('');

    try {
      const res = await fetch(`/api/user/mailboxes/${encodeURIComponent(handleToDelete)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menghapus mailbox');
      }

      const updated = mailboxes.filter((m) => m.handle.toLowerCase() !== handleToDelete.toLowerCase());
      const nextActive = activeMailbox.toLowerCase() === handleToDelete.toLowerCase() ? updated[0]?.handle || '' : activeMailbox;

      onMailboxesUpdated(updated, nextActive);
      setSuccessMessage(`Mailbox ${handleToDelete}@${domain} telah dihapus.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus';
      setInputError(msg);
    }
  };

  const copySqlSchema = () => {
    const sql = `-- Z-Mail Supabase Schema
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mail_visora (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  user_email TEXT REFERENCES public.users(email) ON DELETE CASCADE,
  handle TEXT UNIQUE NOT NULL,
  domain TEXT NOT NULL DEFAULT 'visora.my.id',
  full_email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.verification_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_visora ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_otps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_all" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "mail_visora_all" ON public.mail_visora FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "verification_otps_all" ON public.verification_otps FOR ALL USING (true) WITH CHECK (true);`;

    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        id="mailbox-manager-modal"
        className="relative bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/90">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shadow-xs">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Kelola Mailbox Anda</h3>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    isLimitReached
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {currentCount} / {maxLimit} Mailbox
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Akun Terverifikasi: <span className="font-medium text-slate-700">{user.email}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-mailbox-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Active Mailbox Banner */}
          <div className="p-4 bg-red-50/80 border border-red-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider block">
                Mailbox Aktif (Filter Inbox):
              </span>
              <span className="text-base font-extrabold text-slate-900">
                {activeMailbox}
                <span className="text-red-600 font-semibold">@{domain}</span>
              </span>
            </div>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-600 text-white shadow-xs">
              <Check className="w-3.5 h-3.5" /> Sedang Aktif
            </span>
          </div>

          {/* Feedback notices */}
          {inputError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{inputError}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* New Mailbox Input Form */}
          <form onSubmit={handleApplyNew} className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Tambah Mailbox Custom Baru (Maks. 10):
              </label>
              <span className="text-[11px] text-slate-500">
                Sisa kuota: <strong className="text-slate-800">{Math.max(0, maxLimit - currentCount)}</strong>
              </span>
            </div>

            <div className="flex items-center rounded-xl border border-slate-300 bg-slate-50 focus-within:bg-white focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/20 overflow-hidden transition-all">
              <input
                id="input-mailbox-handle"
                type="text"
                disabled={isLimitReached || isSubmitting}
                value={handleInput}
                onChange={(e) => {
                  setHandleInput(e.target.value);
                  setInputError('');
                }}
                placeholder={isLimitReached ? "Batas maksimal 10 mailbox tercapai" : "nama mailbox (contoh: devan, me, verif)"}
                className="w-full py-2.5 px-3.5 bg-transparent text-slate-900 text-sm font-semibold focus:outline-none placeholder:text-slate-400 disabled:bg-slate-100 disabled:cursor-not-allowed"
              />
              <div className="pr-3.5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100/90 pl-3 border-l border-slate-200 select-none">
                @{domain}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                Nama unik: jika sudah dipakai user lain, tidak dapat diduplikasi.
              </p>
              <button
                type="submit"
                id="btn-apply-mailbox"
                disabled={isLimitReached || isSubmitting || !handleInput.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl shadow-xs shadow-red-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>{isSubmitting ? 'Memeriksa...' : 'Tambah Mailbox'}</span>
              </button>
            </div>
          </form>

          {/* List of User's Mailboxes */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Daftar Mailbox Milik Anda ({mailboxes.length}/10):
            </h4>

            <div className="space-y-2">
              {mailboxes.map((item) => {
                const isSelected = item.handle.toLowerCase() === activeMailbox.toLowerCase();
                return (
                  <div
                    key={item.handle}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-red-50/50 border-red-300 ring-1 ring-red-300'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectMailbox(item.handle);
                          onClose();
                        }}
                        className="text-left font-semibold text-sm text-slate-900 hover:text-red-600 flex items-center gap-2"
                      >
                        <span>{item.handle}</span>
                        <span className="text-red-600 font-normal">@{domain}</span>
                      </button>
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white">
                          Aktif
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!isSelected && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectMailbox(item.handle);
                            onClose();
                          }}
                          className="px-3 py-1 text-xs font-semibold text-slate-700 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          Pilih
                        </button>
                      )}
                      {mailboxes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMailbox(item.handle)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus mailbox ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Inbound suggestions from Resend API (if any) */}
          {foundMailboxes.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Kotak Masuk Terdeteksi di Resend Receiving:
              </h4>
              <div className="flex flex-wrap gap-2">
                {foundMailboxes.map((box) => {
                  const handle = box.includes('@') ? box.split('@')[0] : box;
                  return (
                    <button
                      key={box}
                      type="button"
                      onClick={() => setHandleInput(handle)}
                      className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                      title="Gunakan nama ini di form"
                    >
                      {handle}@{domain}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Supabase Status Card */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Database className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-semibold text-slate-900">
                  Supabase Cloud:{' '}
                  <span className={supabaseConnected ? 'text-emerald-600' : 'text-slate-500'}>
                    {supabaseConnected ? 'Terhubung & Aktif' : 'Standby (Tersinkronisasi)'}
                  </span>
                </p>
                <p className="text-[11px] text-slate-500">
                  Data pengguna & mailbox tersimpan secara permanen.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSqlSchemaModal(true)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-medium text-slate-700 text-xs shadow-2xs transition-colors flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              SQL Schema
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* SQL Schema Sub-Modal */}
      {showSqlSchemaModal && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Supabase SQL Schema</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlSchemaModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Jalankan SQL berikut di <strong>Supabase Dashboard &gt; SQL Editor</strong> untuk membuat tabel{' '}
              <code className="bg-slate-100 px-1 py-0.5 rounded text-red-600 font-mono">users</code>,{' '}
              <code className="bg-slate-100 px-1 py-0.5 rounded text-red-600 font-mono">mail_visora</code>, dan{' '}
              <code className="bg-slate-100 px-1 py-0.5 rounded text-red-600 font-mono">verification_otps</code>.
            </p>
            <div className="relative">
              <pre className="p-3 bg-slate-900 text-slate-100 text-[11px] font-mono rounded-xl max-h-48 overflow-y-auto">
{`CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.mail_visora (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  user_email TEXT REFERENCES public.users(email) ON DELETE CASCADE,
  handle TEXT UNIQUE NOT NULL,
  domain TEXT NOT NULL DEFAULT 'visora.my.id',
  full_email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.verification_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);`}
              </pre>
              <button
                type="button"
                onClick={copySqlSchema}
                className="absolute top-2 right-2 px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-[11px] font-medium flex items-center gap-1 backdrop-blur-xs"
              >
                {copiedSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedSql ? 'Tersalin!' : 'Salin SQL'}
              </button>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowSqlSchemaModal(false)}
                className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-900"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
