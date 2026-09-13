import React, { useState } from 'react';
import { X, Minus, Maximize2, Send, Paperclip, CheckCircle2, AlertCircle } from 'lucide-react';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  fromAddress: string;
  initialTo?: string;
  initialSubject?: string;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  fromAddress,
  initialTo = '',
  initialSubject = '',
}) => {
  const [to, setTo] = useState(initialTo);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to.trim() || !subject.trim()) {
      setStatusMessage({ type: 'error', text: 'Tujuan (To) dan Subjek wajib diisi' });
      return;
    }

    setIsSending(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromAddress,
          to: to.trim(),
          subject: subject.trim(),
          html: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">${body.replace(/\n/g, '<br/>')}</div>`,
          text: body,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengirim email');
      }

      setStatusMessage({ type: 'success', text: 'Email berhasil dikirim via Resend!' });
      setTimeout(() => {
        onClose();
        setTo('');
        setSubject('');
        setBody('');
        setStatusMessage(null);
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengirim pesan';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      id="compose-email-modal"
      className={`fixed bottom-0 right-4 sm:right-8 z-50 bg-white rounded-t-2xl shadow-2xl border border-slate-300 w-full sm:w-[540px] transition-all overflow-hidden flex flex-col ${
        isMinimized ? 'h-11' : 'h-[500px]'
      }`}
    >
      {/* Header */}
      <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between select-none">
        <span className="text-xs font-bold tracking-wide flex items-center gap-2">
          <span>Pesan Baru</span>
          <span className="text-[10px] text-slate-400 font-normal">({fromAddress})</span>
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors"
            title={isMinimized ? 'Perbesar' : 'Kecilkan'}
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            id="btn-close-compose"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors"
            title="Tutup"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <form onSubmit={handleSend} className="flex-1 flex flex-col p-4 space-y-3">
          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* From field */}
          <div className="flex items-center border-b border-slate-200 pb-1.5 text-xs">
            <span className="w-16 text-slate-400 font-medium">Dari:</span>
            <span className="font-semibold text-slate-800">{fromAddress}</span>
          </div>

          {/* To field */}
          <div className="flex items-center border-b border-slate-200 pb-1.5 text-xs">
            <label htmlFor="compose-to" className="w-16 text-slate-400 font-medium">Kepada:</label>
            <input
              id="compose-to"
              type="email"
              required
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="penerima@example.com"
              className="flex-1 bg-transparent text-slate-900 focus:outline-none placeholder:text-slate-400 text-xs font-medium"
            />
          </div>

          {/* Subject field */}
          <div className="flex items-center border-b border-slate-200 pb-1.5 text-xs">
            <label htmlFor="compose-subject" className="w-16 text-slate-400 font-medium">Subjek:</label>
            <input
              id="compose-subject"
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Tulis subjek email di sini"
              className="flex-1 bg-transparent text-slate-900 focus:outline-none placeholder:text-slate-400 text-xs font-medium"
            />
          </div>

          {/* Body field */}
          <div className="flex-1 flex flex-col">
            <textarea
              id="compose-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Tulis isi pesan email Anda di sini..."
              className="w-full flex-1 resize-none bg-transparent text-slate-900 focus:outline-none text-xs leading-relaxed placeholder:text-slate-400 font-sans"
            />
          </div>

          {/* Footer controls */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <button
              type="submit"
              id="btn-send-email-submit"
              disabled={isSending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-red-200 transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? 'Mengirim...' : 'Kirim Pesan'}</span>
            </button>

            <div className="text-[11px] text-slate-400">
              Resend Email Service
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
