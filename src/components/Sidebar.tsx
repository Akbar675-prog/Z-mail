import React from 'react';
import {
  Inbox,
  Star,
  Trash2,
  Mail,
  Plus,
  Layers,
  Edit3,
  Server,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { FolderType } from '../types';

interface SidebarProps {
  currentFolder: FolderType;
  onSelectFolder: (folder: FolderType) => void;
  unreadCount: number;
  starredCount: number;
  totalCount: number;
  activeMailbox: string;
  savedMailboxes: string[];
  domain: string;
  onSelectMailbox: (mailbox: string) => void;
  onOpenMailboxModal: () => void;
  onOpenCompose: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentFolder,
  onSelectFolder,
  unreadCount,
  starredCount,
  totalCount,
  activeMailbox,
  savedMailboxes,
  domain,
  onSelectMailbox,
  onOpenMailboxModal,
  onOpenCompose,
  isMobileOpen,
  onCloseMobile,
}) => {
  const navItems = [
    {
      id: 'inbox' as FolderType,
      label: 'Kotak Masuk',
      icon: Inbox,
      badge: unreadCount > 0 ? unreadCount : null,
      badgeColor: 'bg-red-600 text-white',
    },
    {
      id: 'starred' as FolderType,
      label: 'Berbintang',
      icon: Star,
      badge: starredCount > 0 ? starredCount : null,
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      id: 'all' as FolderType,
      label: 'Semua Email',
      icon: Layers,
      badge: totalCount > 0 ? totalCount : null,
      badgeColor: 'bg-slate-200 text-slate-700',
    },
    {
      id: 'trash' as FolderType,
      label: 'Sampah',
      icon: Trash2,
      badge: null,
      badgeColor: '',
    },
  ];

  const content = (
    <div className="flex flex-col h-full py-4 px-3 select-none">
      {/* Compose Button */}
      <div className="mb-4">
        <button
          type="button"
          id="btn-compose-email"
          onClick={() => {
            onOpenCompose();
            onCloseMobile();
          }}
          className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white hover:bg-red-50 text-slate-800 font-semibold text-sm shadow-md hover:shadow-lg border border-slate-200 hover:border-red-200 transition-all group"
        >
          <div className="w-6 h-6 rounded-lg bg-red-100 group-hover:bg-red-600 text-red-600 group-hover:text-white flex items-center justify-center transition-colors">
            <Edit3 className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold tracking-tight">Tulis Pesan</span>
        </button>
      </div>

      {/* Navigation Folders */}
      <nav className="space-y-1 mb-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentFolder === item.id;
          return (
            <button
              key={item.id}
              type="button"
              id={`nav-folder-${item.id}`}
              onClick={() => {
                onSelectFolder(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-red-50 text-red-700 font-bold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-red-600' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== null && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Mailbox Filter / Custom Handles Section */}
      <div className="mb-4 pt-4 border-t border-slate-200 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-2 px-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Mailbox Anda
          </span>
          <button
            type="button"
            id="btn-sidebar-add-mailbox"
            onClick={onOpenMailboxModal}
            className="p-1 rounded text-red-600 hover:bg-red-50 transition-colors"
            title="Tambah / Atur Nama Mailbox"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-1">
          {savedMailboxes.map((handle) => {
            const isSelected = handle.toLowerCase() === activeMailbox.toLowerCase();
            return (
              <button
                key={handle}
                type="button"
                id={`sidebar-mailbox-${handle}`}
                onClick={() => {
                  onSelectMailbox(handle);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all text-left ${
                  isSelected
                    ? 'bg-white text-slate-900 font-bold border border-red-200 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isSelected ? 'bg-red-600' : 'bg-slate-300'
                    }`}
                  />
                  <span className="truncate">{handle}</span>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0 font-normal">
                  @{domain.split('.')[0]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Action Button to Open Mailbox Modal */}
        <button
          type="button"
          id="btn-sidebar-manage-mailboxes"
          onClick={onOpenMailboxModal}
          className="mt-3 w-full py-2 px-2.5 rounded-xl border border-dashed border-slate-300 hover:border-red-300 text-slate-600 hover:text-red-600 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors bg-white/50 hover:bg-white"
        >
          <Mail className="w-3.5 h-3.5 text-red-500" />
          <span>Ganti / Atur Mailbox</span>
          <ChevronRight className="w-3 h-3 text-slate-400" />
        </button>
      </div>

      {/* Provider & Domain Status Info */}
      <div className="pt-3 border-t border-slate-200">
        <div className="p-2.5 rounded-xl bg-slate-100/80 border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
          <div className="flex items-center justify-between font-semibold text-slate-800">
            <span className="flex items-center gap-1">
              <Server className="w-3.5 h-3.5 text-red-600" />
              Resend Inbound
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
              <ShieldCheck className="w-3 h-3" /> Aktif
            </span>
          </div>
          <div className="truncate text-slate-500">
            Domain: <span className="font-semibold text-slate-700">@{domain}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 border-r border-slate-200 bg-slate-50/50 shrink-0 h-[calc(100vh-57px)]">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[80vw] bg-white h-full shadow-2xl z-10">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
