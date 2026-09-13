import React, { useState } from 'react';
import { Mail, Search, RefreshCw, Copy, Check, ChevronDown, LogOut, Menu, Settings2 } from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
  user: User;
  domain: string;
  activeMailbox: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenMailboxModal: () => void;
  onLogout: () => void;
  onToggleSidebar: () => void;
  autoRefreshInterval: number;
  onSetAutoRefreshInterval: (seconds: number) => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  domain,
  activeMailbox,
  searchQuery,
  onSearchChange,
  onRefresh,
  isRefreshing,
  onOpenMailboxModal,
  onLogout,
  onToggleSidebar,
  autoRefreshInterval,
  onSetAutoRefreshInterval,
}) => {
  const [copied, setCopied] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [autoRefreshMenuOpen, setAutoRefreshMenuOpen] = useState(false);

  const fullEmail = `${activeMailbox}@${domain}`;

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(fullEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div className="px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Mobile Toggle & Brand */}
        <div className="flex items-center gap-3 min-w-[200px]">
          <button
            type="button"
            id="btn-toggle-sidebar"
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            title="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 select-none">
            <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center shadow-sm shadow-red-200">
              <Mail className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black tracking-tight text-slate-900">Z-Mail</span>
              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                Resend
              </span>
            </div>
          </div>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-2xl">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              id="input-search-emails"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={`Cari email di ${fullEmail}...`}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-slate-900 text-sm rounded-xl border border-transparent focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Right: Active Mailbox Pill, Refresh, User Profile */}
        <div className="flex items-center gap-2">
          {/* Active Mailbox Button (Triggers Mailbox Pop Up) */}
          <div className="hidden sm:flex items-center bg-red-50/80 border border-red-200 rounded-xl p-1 pl-2.5">
            <button
              type="button"
              id="btn-active-mailbox-pill"
              onClick={onOpenMailboxModal}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 hover:text-red-700 transition-colors mr-2"
              title="Klik untuk ganti atau atur nama mailbox"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-slate-900">{activeMailbox}</span>
              <span className="text-red-600 font-medium">@{domain}</span>
              <Settings2 className="w-3 h-3 text-red-500 ml-0.5" />
            </button>
            <button
              type="button"
              id="btn-copy-active-email"
              onClick={handleCopyEmail}
              className="p-1 rounded-lg bg-white hover:bg-red-100/50 text-slate-600 hover:text-red-700 border border-red-100 transition-colors"
              title="Salin alamat email ini"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Refresh Button & Auto-refresh Dropdown */}
          <div className="relative flex items-center">
            <button
              type="button"
              id="btn-refresh-emails"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-50 transition-colors"
              title="Perbarui Kotak Masuk Sekarang"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-red-600' : ''}`} />
            </button>
            <button
              type="button"
              id="btn-auto-refresh-toggle"
              onClick={() => setAutoRefreshMenuOpen(!autoRefreshMenuOpen)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
              title="Pengaturan interval auto-refresh"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {autoRefreshMenuOpen && (
              <div className="absolute right-0 top-10 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-40 text-xs">
                <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Auto Refresh
                </div>
                {[
                  { label: 'Setiap 10 detik', value: 10 },
                  { label: 'Setiap 30 detik', value: 30 },
                  { label: 'Setiap 60 detik', value: 60 },
                  { label: 'Matikan Auto-Refresh', value: 0 },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      onSetAutoRefreshInterval(item.value);
                      setAutoRefreshMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 transition-colors ${
                      autoRefreshInterval === item.value ? 'text-red-600 font-semibold' : 'text-slate-700'
                    }`}
                  >
                    <span>{item.label}</span>
                    {autoRefreshInterval === item.value && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              type="button"
              id="btn-user-avatar"
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-1.5 p-1 rounded-full hover:ring-2 hover:ring-slate-200 transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold uppercase">
                {user.email ? user.email.charAt(0) : 'U'}
              </div>
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 top-11 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-40 text-sm">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="font-bold text-slate-900 truncate">{user.email.split('@')[0]}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-[11px] font-semibold text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Terverifikasi OTP
                  </div>
                </div>

                <div className="pt-1.5">
                  <button
                    type="button"
                    id="btn-profile-change-mailbox"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onOpenMailboxModal();
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Mail className="w-4 h-4 text-red-500" />
                    Ganti / Atur Mailbox
                  </button>
                  <button
                    type="button"
                    id="btn-logout"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Keluar dari Akun
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
