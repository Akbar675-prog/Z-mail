import { useEffect, useState, useCallback, useMemo, type MouseEvent } from 'react';
import { User, EmailSummary, FolderType, MailboxItem } from './types';
import { AuthScreen } from './components/AuthScreen';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { EmailList } from './components/EmailList';
import { MailboxModal } from './components/MailboxModal';
import { EmailDetailModal } from './components/EmailDetailModal';
import { ComposeModal } from './components/ComposeModal';

export default function App() {
  const [domain, setDomain] = useState('visora.my.id');
  const [supabaseConnected, setSupabaseConnected] = useState(false);

  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('zmail_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [mailboxes, setMailboxes] = useState<MailboxItem[]>(() => {
    try {
      const saved = localStorage.getItem('zmail_mailboxes');
      if (saved) return JSON.parse(saved);
      if (user?.mailboxes?.length) return user.mailboxes;
      return [{ handle: 'devan', full_email: 'devan@visora.my.id' }];
    } catch {
      return [{ handle: 'devan', full_email: 'devan@visora.my.id' }];
    }
  });

  const [activeMailbox, setActiveMailbox] = useState<string>(() => {
    try {
      const savedBox = localStorage.getItem('zmail_active_mailbox');
      return savedBox || user?.activeMailbox || 'devan';
    } catch {
      return 'devan';
    }
  });

  const [foundMailboxes, setFoundMailboxes] = useState<string[]>([]);
  const [emails, setEmails] = useState<EmailSummary[]>([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<FolderType>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmailIds, setSelectedEmailIds] = useState<Set<string>>(new Set());

  // Modals state
  const [isMailboxModalOpen, setIsMailboxModalOpen] = useState(false);
  const [openedEmail, setOpenedEmail] = useState<EmailSummary | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeInitial, setComposeInitial] = useState<{ to?: string; subject?: string }>({});
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Auto-refresh interval (seconds)
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(30);

  // Client-side persistent states for reads, stars, trash
  const [readEmailIds, setReadEmailIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('zmail_read_ids');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [starredEmailIds, setStarredEmailIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('zmail_starred_ids');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [trashEmailIds, setTrashEmailIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('zmail_trash_ids');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Save changes to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('zmail_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('zmail_user');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('zmail_active_mailbox', activeMailbox);
  }, [activeMailbox]);

  useEffect(() => {
    localStorage.setItem('zmail_mailboxes', JSON.stringify(mailboxes));
  }, [mailboxes]);

  useEffect(() => {
    localStorage.setItem('zmail_read_ids', JSON.stringify(Array.from(readEmailIds)));
  }, [readEmailIds]);

  useEffect(() => {
    localStorage.setItem('zmail_starred_ids', JSON.stringify(Array.from(starredEmailIds)));
  }, [starredEmailIds]);

  useEffect(() => {
    localStorage.setItem('zmail_trash_ids', JSON.stringify(Array.from(trashEmailIds)));
  }, [trashEmailIds]);

  // Fetch initial config from server
  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((cfg) => {
        if (cfg.domain) setDomain(cfg.domain);
        if (typeof cfg.supabaseConnected === 'boolean') {
          setSupabaseConnected(cfg.supabaseConnected);
        }
      })
      .catch((err) => console.error('Failed to get config:', err));
  }, []);

  // Fetch receiving emails from Resend via our server API
  const fetchEmails = useCallback(
    async (showLoading = true) => {
      if (showLoading) setIsLoadingEmails(true);
      try {
        const queryParam = activeMailbox ? `?mailbox=${encodeURIComponent(activeMailbox)}` : '';
        const res = await fetch(`/api/emails/receiving${queryParam}`);
        const result = await res.json();

        if (result.success && Array.isArray(result.data)) {
          setEmails(result.data);
          if (Array.isArray(result.foundMailboxes)) {
            setFoundMailboxes(result.foundMailboxes);
          }
        }
      } catch (err) {
        console.error('Error fetching emails from Resend:', err);
      } finally {
        if (showLoading) setIsLoadingEmails(false);
      }
    },
    [activeMailbox]
  );

  // Trigger fetch when activeMailbox changes or component mounts
  useEffect(() => {
    if (user) {
      fetchEmails(true);
    }
  }, [user, activeMailbox, fetchEmails]);

  // Periodic Auto-refresh
  useEffect(() => {
    if (!user || autoRefreshInterval <= 0) return;

    const timer = setInterval(() => {
      fetchEmails(false);
    }, autoRefreshInterval * 1000);

    return () => clearInterval(timer);
  }, [user, autoRefreshInterval, fetchEmails]);

  // Combine fetched emails with local read/starred/trash states
  const processedEmails = useMemo(() => {
    return emails.map((item) => ({
      ...item,
      isRead: readEmailIds.has(item.id),
      isStarred: starredEmailIds.has(item.id),
      isDeleted: trashEmailIds.has(item.id),
    }));
  }, [emails, readEmailIds, starredEmailIds, trashEmailIds]);

  // Filter emails based on current folder & search query
  const filteredEmails = useMemo(() => {
    return processedEmails.filter((email) => {
      // 1. Check folder status
      if (currentFolder === 'trash') {
        if (!email.isDeleted) return false;
      } else {
        if (email.isDeleted) return false;
        if (currentFolder === 'starred' && !email.isStarred) return false;
      }

      // 2. Search query match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSubject = email.subject?.toLowerCase().includes(q);
        const matchFrom = email.from?.toLowerCase().includes(q);
        const matchTo = email.to?.some((t) => t.toLowerCase().includes(q));
        if (!matchSubject && !matchFrom && !matchTo) return false;
      }

      return true;
    });
  }, [processedEmails, currentFolder, searchQuery]);

  // Folder Counts
  const unreadCount = useMemo(() => {
    return processedEmails.filter((e) => !e.isDeleted && !e.isRead).length;
  }, [processedEmails]);

  const starredCount = useMemo(() => {
    return processedEmails.filter((e) => !e.isDeleted && e.isStarred).length;
  }, [processedEmails]);

  const totalCount = useMemo(() => {
    return processedEmails.filter((e) => !e.isDeleted).length;
  }, [processedEmails]);

  // Handlers
  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    if (loggedInUser.mailboxes && loggedInUser.mailboxes.length > 0) {
      setMailboxes(loggedInUser.mailboxes);
      const active = loggedInUser.activeMailbox || loggedInUser.mailboxes[0].handle;
      setActiveMailbox(active);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setSelectedEmailIds(new Set());
    setOpenedEmail(null);
  };

  const handleSelectMailbox = (box: string) => {
    const clean = box.includes('@') ? box.split('@')[0] : box;
    setActiveMailbox(clean);
    setSelectedEmailIds(new Set());
    setOpenedEmail(null);
  };

  const handleMailboxesUpdated = (newMailboxes: MailboxItem[], newActiveHandle?: string) => {
    setMailboxes(newMailboxes);
    if (user) {
      setUser({ ...user, mailboxes: newMailboxes });
    }
    if (newActiveHandle) {
      setActiveMailbox(newActiveHandle);
    }
  };

  const handleToggleStar = (id: string, e?: MouseEvent) => {
    if (e) e.stopPropagation();
    setStarredEmailIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMarkRead = (id: string, read: boolean) => {
    setReadEmailIds((prev) => {
      const next = new Set(prev);
      if (read) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleDeleteEmail = (id: string, e?: MouseEvent) => {
    if (e) e.stopPropagation();
    setTrashEmailIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setSelectedEmailIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (openedEmail?.id === id) {
      setOpenedEmail(null);
    }
  };

  const handleToggleSelectEmail = (id: string) => {
    setSelectedEmailIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmailIds(new Set(filteredEmails.map((e) => e.id)));
    } else {
      setSelectedEmailIds(new Set());
    }
  };

  const handleOpenEmail = (email: EmailSummary) => {
    setOpenedEmail(email);
    handleMarkRead(email.id, true);
  };

  const handleReplyEmail = (targetEmail: string, subject: string) => {
    setComposeInitial({
      to: targetEmail,
      subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
    });
    setIsComposeOpen(true);
  };

  // If user is not logged in, show the OTP AuthScreen
  if (!user) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} domain={domain} />;
  }

  const savedHandleList = mailboxes.map((m) => m.handle);

  return (
    <div id="zmail-app-root" className="min-h-screen bg-white text-slate-900 flex flex-col font-sans antialiased">
      {/* Top Header */}
      <Header
        user={user}
        domain={domain}
        activeMailbox={activeMailbox}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onRefresh={() => fetchEmails(true)}
        isRefreshing={isLoadingEmails}
        onOpenMailboxModal={() => setIsMailboxModalOpen(true)}
        onLogout={handleLogout}
        onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        autoRefreshInterval={autoRefreshInterval}
        onSetAutoRefreshInterval={setAutoRefreshInterval}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          currentFolder={currentFolder}
          onSelectFolder={setCurrentFolder}
          unreadCount={unreadCount}
          starredCount={starredCount}
          totalCount={totalCount}
          activeMailbox={activeMailbox}
          savedMailboxes={savedHandleList}
          domain={domain}
          onSelectMailbox={handleSelectMailbox}
          onOpenMailboxModal={() => setIsMailboxModalOpen(true)}
          onOpenCompose={() => {
            setComposeInitial({});
            setIsComposeOpen(true);
          }}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white">
          {openedEmail ? (
            <EmailDetailModal
              email={openedEmail}
              onClose={() => setOpenedEmail(null)}
              onReply={handleReplyEmail}
              onDelete={(id) => {
                handleDeleteEmail(id);
                setOpenedEmail(null);
              }}
              onToggleStar={handleToggleStar}
              isStarred={starredEmailIds.has(openedEmail.id)}
            />
          ) : (
            <EmailList
              emails={filteredEmails}
              activeMailbox={activeMailbox}
              domain={domain}
              currentFolder={currentFolder}
              selectedEmailIds={selectedEmailIds}
              onToggleSelectEmail={handleToggleSelectEmail}
              onSelectAll={handleSelectAll}
              onToggleStar={handleToggleStar}
              onMarkRead={handleMarkRead}
              onDeleteEmail={handleDeleteEmail}
              onOpenEmail={handleOpenEmail}
              onOpenMailboxModal={() => setIsMailboxModalOpen(true)}
              onSelectMailbox={handleSelectMailbox}
              isLoading={isLoadingEmails}
            />
          )}
        </main>
      </div>

      {/* Pop-up Mailbox Modal with 10 limits and uniqueness enforcement */}
      <MailboxModal
        isOpen={isMailboxModalOpen}
        onClose={() => setIsMailboxModalOpen(false)}
        domain={domain}
        user={user}
        activeMailbox={activeMailbox}
        mailboxes={mailboxes}
        foundMailboxes={foundMailboxes}
        onSelectMailbox={handleSelectMailbox}
        onMailboxesUpdated={handleMailboxesUpdated}
        supabaseConnected={supabaseConnected}
      />

      {/* Compose / Send Email Pop-up Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        fromAddress={`${activeMailbox}@${domain}`}
        initialTo={composeInitial.to}
        initialSubject={composeInitial.subject}
      />
    </div>
  );
}
