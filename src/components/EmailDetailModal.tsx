import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Star,
  Trash2,
  Mail,
  Reply,
  Copy,
  Check,
  Code,
  FileText,
  Eye,
  ExternalLink,
  ShieldCheck,
  Paperclip,
} from 'lucide-react';
import { EmailDetail, EmailSummary } from '../types';

interface EmailDetailModalProps {
  emailSummary: EmailSummary;
  onClose: () => void;
  onToggleStar: (id: string) => void;
  onDelete: (id: string) => void;
  onReply: (to: string, subject: string) => void;
  domain: string;
}

export const EmailDetailModal: React.FC<EmailDetailModalProps> = ({
  emailSummary,
  onClose,
  onToggleStar,
  onDelete,
  onReply,
  domain,
}) => {
  const [detail, setDetail] = useState<EmailDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'html' | 'text' | 'headers'>('html');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetch(`/api/emails/receiving/${emailSummary.id}`)
      .then((res) => res.json())
      .then((res) => {
        if (isMounted) {
          if (res.success && res.data) {
            setDetail({ ...emailSummary, ...res.data });
          } else {
            setDetail(emailSummary as EmailDetail);
          }
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load email details:', err);
        if (isMounted) {
          setDetail(emailSummary as EmailDetail);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [emailSummary]);

  const handleCopyBody = () => {
    const textToCopy = detail?.text || detail?.html || '';
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const senderInitial = emailSummary.from
    ? emailSummary.from.replace(/["'<]/g, '').trim().charAt(0).toUpperCase()
    : 'U';

  const formattedDate = new Date(emailSummary.created_at).toLocaleString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Top Toolbar */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-back-to-list"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors flex items-center gap-1 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>
          <div className="h-4 w-px bg-slate-300 mx-1" />
          <button
            type="button"
            id="btn-detail-star"
            onClick={() => onToggleStar(emailSummary.id)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-500 hover:bg-slate-200/70 transition-colors"
            title="Tandai Berbintang"
          >
            <Star
              className={`w-4 h-4 ${
                emailSummary.isStarred
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-slate-400'
              }`}
            />
          </button>
          <button
            type="button"
            id="btn-detail-delete"
            onClick={() => {
              onDelete(emailSummary.id);
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Pindahkan ke Sampah"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-detail-reply"
            onClick={() => onReply(emailSummary.from, emailSummary.subject)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-xs"
          >
            <Reply className="w-3.5 h-3.5" />
            <span>Balas</span>
          </button>
        </div>
      </div>

      {/* Main Email Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Subject Header */}
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {emailSummary.subject || '(Tanpa Subjek)'}
          </h2>
          <span className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium">
            Kotak Masuk
          </span>
        </div>

        {/* Sender & Recipient Information */}
        <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
              {senderInitial}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-slate-900">
                  {emailSummary.from}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Kepada:{' '}
                <span className="font-medium text-slate-700">
                  {emailSummary.to.join(', ')}
                </span>
              </div>
              <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <ShieldCheck className="w-3 h-3" />
                Diterima secara aman via Resend Inbound (@{domain})
              </div>
            </div>
          </div>
          <div className="text-right text-xs text-slate-400 shrink-0">
            {formattedDate}
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              id="tab-view-html"
              onClick={() => setActiveTab('html')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'html'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Tampilan HTML</span>
            </button>
            <button
              type="button"
              id="tab-view-text"
              onClick={() => setActiveTab('text')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'text'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Teks Polos</span>
            </button>
            <button
              type="button"
              id="tab-view-headers"
              onClick={() => setActiveTab('headers')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'headers'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Headers / Raw</span>
            </button>
          </div>

          <button
            type="button"
            id="btn-copy-body"
            onClick={handleCopyBody}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-semibold">Tersalin</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Salin Konten</span>
              </>
            )}
          </button>
        </div>

        {/* Email Body Rendering */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
            <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Memuat isi email lengkap dari Resend...</span>
          </div>
        ) : (
          <div className="min-h-[300px]">
            {activeTab === 'html' && (
              detail?.html ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
                  <iframe
                    title="Email HTML Preview"
                    sandbox="allow-popups allow-same-origin"
                    srcDoc={detail.html}
                    className="w-full min-h-[500px] border-0"
                  />
                </div>
              ) : (
                <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap font-sans">
                  {detail?.text || 'Tidak ada konten HTML pada email ini.'}
                </div>
              )
            )}

            {activeTab === 'text' && (
              <div className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs whitespace-pre-wrap overflow-x-auto leading-relaxed">
                {detail?.text || detail?.html || 'Tidak ada teks polos.'}
              </div>
            )}

            {activeTab === 'headers' && (
              <div className="p-4 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs overflow-x-auto space-y-2">
                <div className="text-slate-400 font-bold border-b border-slate-800 pb-1">
                  Message ID: {detail?.message_id || 'N/A'}
                </div>
                {detail?.headers ? (
                  <pre className="text-[11px] whitespace-pre-wrap">
                    {JSON.stringify(detail.headers, null, 2)}
                  </pre>
                ) : (
                  <p className="text-slate-400">Tidak ada header khusus tambahan.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Attachments Section if present */}
        {detail?.attachments && detail.attachments.length > 0 && (
          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Paperclip className="w-4 h-4 text-slate-400" />
              Lampiran ({detail.attachments.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {detail.attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 px-3 rounded-lg bg-slate-100 border border-slate-200 text-xs font-medium text-slate-800"
                >
                  <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                  <span>{att.filename || `Lampiran ${idx + 1}`}</span>
                  {att.size && (
                    <span className="text-slate-400 text-[10px]">
                      ({Math.round(att.size / 1024)} KB)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
