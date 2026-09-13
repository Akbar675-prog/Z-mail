import React from 'react';
import {
  Star,
  Mail,
  Paperclip,
  CheckSquare,
  Square,
  Clock,
  Inbox,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { EmailSummary, FolderType } from '../types';

interface EmailListProps {
  emails: EmailSummary[];
  activeMailbox: string;
  domain: string;
  currentFolder: FolderType;
  selectedEmailIds: Set<string>;
  onToggleSelectEmail: (id: string) => void;
  onSelectAll: (select: boolean) => void;
  onToggleStar: (id: string, e: React.MouseEvent) => void;
  onMarkRead: (id: string, read: boolean) => void;
  onDeleteEmail: (id: string, e: React.MouseEvent) => void;
  onOpenEmail: (email: EmailSummary) => void;
  onOpenMailboxModal: () => void;
  onSelectMailbox: (mailbox: string) => void;
  isLoading: boolean;
}

export const EmailList: React.FC<EmailListProps> = ({
  emails,
  activeMailbox,
  domain,
  currentFolder,
  selectedEmailIds,
  onToggleSelectEmail,
  onSelectAll,
  onToggleStar,
  onDeleteEmail,
  onOpenEmail,
  onOpenMailboxModal,
  onSelectMailbox,
  isLoading,
}) => {
  const allSelected = emails.length > 0 && selectedEmailIds.size === emails.length;

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

      if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    } catch {
      return isoString;
    }
  };

  const getCleanSenderName = (from: string) => {
    if (!from) return 'Pengirim Tanpa Nama';
    const match = from.match(/^(.*?)(<.*?>)?$/);
    if (match && match[1].trim()) {
      return match[1].replace(/"/g, '').trim();
    }
    return from;
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-3.5 rounded-xl bg-slate-100 animate-pulse"
          >
            <div className="w-5 h-5 bg-slate-200 rounded" />
            <div className="w-5 h-5 bg-slate-200 rounded" />
            <div className="w-32 h-4 bg-slate-200 rounded" />
            <div className="flex-1 h-4 bg-slate-200 rounded" />
            <div className="w-16 h-4 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (emails.length === 0) {
    const isFilteredByCustomHandle = activeMailbox !== 'all';
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
          <Inbox className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">
          {currentFolder === 'starred'
            ? 'Belum ada email berbintang'
            : currentFolder === 'trash'
            ? 'Kotak sampah kosong'
            : `Belum ada email masuk untuk ${activeMailbox}@${domain}`}
        </h3>
        <p className="mt-2 text-xs text-slate-500 leading-relaxed">
          {currentFolder === 'inbox' && isFilteredByCustomHandle ? (
            <>
              Z-Mail hanya menyaring dan menampilkan email yang ditujukan khusus ke{' '}
              <strong className="text-slate-800">{activeMailbox}@{domain}</strong>. Kirimkan email ke alamat ini sekarang untuk melihatnya langsung!
            </>
          ) : (
            'Tidak ada email yang ditemukan dalam kategori ini.'
          )}
        </p>

        {currentFolder === 'inbox' && isFilteredByCustomHandle && (
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            <button
              type="button"
              id="btn-switch-to-otp-mailbox"
              onClick={() => onSelectMailbox('otp')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-red-50 text-red-700 hover:bg-red-100 transition-colors border border-red-200"
            >
              <Sparkles className="w-3.5 h-3.5 text-red-600" />
              <span>Coba lihat mailbox &quot;otp@{domain}&quot;</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              id="btn-open-modal-from-empty"
              onClick={onOpenMailboxModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Ganti / Masukkan Nama Mailbox Lain</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Top action toolbar */}
      <div className="px-4 py-2 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 select-none">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onSelectAll(!allSelected)}
            className="p-1 rounded text-slate-500 hover:text-slate-800 transition-colors"
            title={allSelected ? 'Batalkan pilihan' : 'Pilih semua'}
          >
            {allSelected ? (
              <CheckSquare className="w-4 h-4 text-red-600" />
            ) : (
              <Square className="w-4 h-4" />
            )}
          </button>
          <span className="text-slate-500">
            {selectedEmailIds.size > 0 ? (
              <span className="font-semibold text-slate-800">
                {selectedEmailIds.size} dipilih
              </span>
            ) : (
              <span>{emails.length} email</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Saringan Aktif: <strong>{activeMailbox}@{domain}</strong></span>
        </div>
      </div>

      {/* Email rows list */}
      <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
        {emails.map((email) => {
          const isSelected = selectedEmailIds.has(email.id);
          const senderName = getCleanSenderName(email.from);
          const isUnread = !email.isRead;

          return (
            <div
              key={email.id}
              id={`email-row-${email.id}`}
              onClick={() => onOpenEmail(email)}
              className={`group flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-l-3 ${
                isSelected
                  ? 'bg-red-50/50 border-red-600'
                  : isUnread
                  ? 'bg-slate-50/60 hover:bg-slate-100/80 border-red-500 font-medium'
                  : 'bg-white hover:bg-slate-50 border-transparent'
              }`}
            >
              {/* Checkbox */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelectEmail(email.id);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                {isSelected ? (
                  <CheckSquare className="w-4 h-4 text-red-600" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
              </div>

              {/* Star */}
              <button
                type="button"
                id={`btn-star-${email.id}`}
                onClick={(e) => onToggleStar(email.id, e)}
                className="p-1 rounded text-slate-300 hover:text-amber-400 transition-colors"
              >
                <Star
                  className={`w-4 h-4 ${
                    email.isStarred
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-300 hover:text-amber-400'
                  }`}
                />
              </button>

              {/* Sender info */}
              <div className="w-44 shrink-0 truncate">
                <span
                  className={`text-xs ${
                    isUnread ? 'font-bold text-slate-900' : 'text-slate-700'
                  }`}
                >
                  {senderName}
                </span>
              </div>

              {/* Subject & Preview Snippet */}
              <div className="flex-1 min-w-0 flex items-baseline gap-2">
                <span
                  className={`text-xs truncate ${
                    isUnread ? 'font-bold text-slate-900' : 'text-slate-800'
                  }`}
                >
                  {email.subject || '(Tanpa Subjek)'}
                </span>
                <span className="hidden sm:inline text-xs text-slate-400 truncate">
                  - {email.to.join(', ')}
                </span>
              </div>

              {/* Attachment badge */}
              {email.attachments && email.attachments.length > 0 && (
                <div className="shrink-0 text-slate-400" title="Memiliki lampiran">
                  <Paperclip className="w-3.5 h-3.5" />
                </div>
              )}

              {/* Date */}
              <div className="shrink-0 text-right">
                <span
                  className={`text-[11px] ${
                    isUnread ? 'font-bold text-red-600' : 'text-slate-400'
                  }`}
                >
                  {formatDate(email.created_at)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
