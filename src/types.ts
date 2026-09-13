export interface MailboxItem {
  id?: string;
  handle: string;
  full_email: string;
  created_at?: string;
}

export interface User {
  id: string;
  email: string; // Personal email (e.g. user@gmail.com, user@outlook.com)
  activeMailbox: string; // Currently viewed handle (e.g. "devan")
  mailboxes: MailboxItem[]; // Custom mailboxes on @visora.my.id (max 10)
  createdAt: string;
}

export interface EmailSummary {
  id: string;
  to: string[];
  from: string;
  created_at: string;
  subject: string;
  bcc?: string[];
  cc?: string[];
  reply_to?: string[];
  message_id?: string;
  attachments?: Array<{
    id?: string;
    filename?: string;
    content_type?: string;
    size?: number;
    [key: string]: unknown;
  }>;
  // Client-side local overrides
  isRead?: boolean;
  isStarred?: boolean;
  isDeleted?: boolean;
}

export interface EmailDetail extends EmailSummary {
  html?: string;
  text?: string;
  headers?: Record<string, string>;
  raw?: string;
  received_for?: string;
}

export type FolderType = 'inbox' | 'starred' | 'all' | 'trash';
