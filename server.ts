import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import {
  saveOtp,
  verifyOtpCode,
  getOrCreateUser,
  getUserMailboxes,
  addMailboxForUser,
  deleteMailboxForUser,
  isHandleTaken,
  isSupabaseConnected,
} from './server/supabaseService';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Resend Configuration
// Key 1: Inbound email reading key
const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_AdQ3B8rU_9vY7JPrp5Fnzys7Tot5cX44x';

// Key 2: OTP sending key
const RESEND_OTP_API_KEY = process.env.RESEND_OTP_API_KEY || 're_FMwggPNL_N12Nt7Y4UdcyyYZ1z8NrDCXd';

// Sender for verification emails
const OTP_SENDER_EMAIL = process.env.OTP_SENDER_EMAIL || 'no-reply@verification.visora.my.id';

// Custom mailbox domain
const PRIMARY_DOMAIN = process.env.RESEND_DOMAIN || 'visora.my.id';

// ==========================================
// SYSTEM & HEALTH ENDPOINTS
// ==========================================
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    domain: PRIMARY_DOMAIN,
    supabaseConnected: isSupabaseConnected(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/config', (req: Request, res: Response) => {
  res.json({
    domain: PRIMARY_DOMAIN,
    otpSender: OTP_SENDER_EMAIL,
    hasApiKey: Boolean(RESEND_API_KEY),
    hasOtpApiKey: Boolean(RESEND_OTP_API_KEY),
    supabaseConnected: isSupabaseConnected(),
    supabaseUrl: process.env.SUPABASE_URL || '',
  });
});

// ==========================================
// AUTHENTICATION: OTP VIA RESEND & USER LOGIN
// ==========================================

/**
 * Step 1: Kirim 6-Digit OTP ke email pribadi pengguna
 * Pengguna HARUS memasukkan email pribadinya (misal: user@gmail.com, @outlook.com)
 */
app.post('/api/auth/send-otp', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'Email pribadi wajib diisi' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      res.status(400).json({ error: 'Format email tidak valid. Gunakan email pribadi Anda (misal: nama@gmail.com).' });
      return;
    }

    // Hindari menggunakan domain internal @visora.my.id untuk login awal
    if (cleanEmail.endsWith(`@${PRIMARY_DOMAIN.toLowerCase()}`)) {
      res.status(400).json({
        error: `Silakan gunakan email pribadi Anda (seperti Gmail, Outlook, Yahoo, dll) untuk verifikasi, bukan domain @${PRIMARY_DOMAIN}.`,
      });
      return;
    }

    // Buat 6 digit kode OTP acak
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Simpan di DB / Memori
    await saveOtp(cleanEmail, otpCode);

    console.log(`[OTP] Mengirim kode OTP ${otpCode} ke ${cleanEmail} via Resend (${OTP_SENDER_EMAIL})...`);

    // Kirim email via Resend API menggunakan RESEND_OTP_API_KEY
    const emailPayload = {
      from: OTP_SENDER_EMAIL,
      to: [cleanEmail],
      subject: `Kode Verifikasi Z-Mail: ${otpCode}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
            .card { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .badge { display: inline-block; background: #fee2e2; color: #dc2626; font-weight: 700; font-size: 12px; padding: 4px 10px; border-radius: 9999px; margin-bottom: 12px; }
            .code-box { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
            .code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #dc2626; font-family: monospace; }
            .footer { font-size: 12px; color: #64748b; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">Z-Mail Verification</span>
            <h2 style="margin: 0 0 8px 0; color: #0f172a; font-size: 22px;">Verifikasi Akun Z-Mail</h2>
            <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.5;">
              Gunakan kode verifikasi berikut untuk masuk ke akun Z-Mail Anda:
            </p>
            <div class="code-box">
              <div class="code">${otpCode}</div>
            </div>
            <p style="margin: 0; color: #64748b; font-size: 13px;">
              Kode ini hanya berlaku selama <strong>10 menit</strong>. Jangan berikan kode ini kepada siapa pun demi keamanan akun Anda.
            </p>
            <div class="footer">
              Email ini dikirim secara otomatis oleh sistem <strong>Z-Mail</strong> (@${PRIMARY_DOMAIN}). Jika Anda tidak meminta kode ini, Anda dapat mengabaikan pesan ini.
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Kode Verifikasi Z-Mail Anda adalah: ${otpCode}. Berlaku selama 10 menit.`,
    };

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_OTP_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    const resendData = (await resendRes.json()) as { id?: string; error?: string; message?: string; name?: string };

    if (!resendRes.ok) {
      console.warn('[Resend OTP Error]:', resendRes.status, resendData);
      
      // Jika terjadi batasan domain sandbox di Resend (misal: hanya bisa kirim ke email akun yang diverifikasi di Resend)
      // Kita kembalikan pesan jelas, dan dalam mode preview sertakan debug OTP agar user tidak terhalang.
      return res.status(200).json({
        success: true,
        message: `Resend respon: ${resendData.message || 'OTP dibuat'}. Silakan cek inbox/spam email Anda.`,
        note: 'Jika akun Resend masih dalam mode testing, gunakan kode OTP berikut atau email terdaftar di Resend.',
        debugCode: otpCode,
      });
    }

    console.log('[OTP] Email OTP terkirim sukses, Resend ID:', resendData.id);

    res.json({
      success: true,
      message: `Kode verifikasi 6 digit telah dikirim ke ${cleanEmail}`,
      resendId: resendData.id,
    });
  } catch (error) {
    console.error('Failed to send OTP:', error);
    res.status(500).json({
      error: 'Terjadi kesalahan sistem saat mengirim kode OTP',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Step 2: Verifikasi 6-Digit OTP dan Login/Registrasi
 */
app.post('/api/auth/verify-otp', async (req: Request, res: Response) => {
  try {
    const { email, otpCode } = req.body;
    if (!email || !otpCode) {
      res.status(400).json({ error: 'Email dan 6-digit kode OTP wajib diisi' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = String(otpCode).trim();

    const verification = await verifyOtpCode(cleanEmail, cleanCode);
    if (!verification.success) {
      res.status(400).json({ error: verification.message || 'Kode OTP tidak valid atau telah kadaluarsa' });
      return;
    }

    // Dapatkan atau buat pengguna di Supabase/DB
    const dbUser = await getOrCreateUser(cleanEmail);

    // Ambil daftar mailbox custom milik pengguna ini
    let mailboxes = await getUserMailboxes(dbUser.id, dbUser.email);

    // Jika user baru belum punya mailbox sama sekali, otomatis buatkan mailbox pertama
    if (mailboxes.length === 0) {
      // Ambil calon nama handle dari email (misal: "john" dari "john.doe@gmail.com")
      let initialHandle = cleanEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '');
      if (!initialHandle || initialHandle.length < 2) {
        initialHandle = 'user';
      }

      // Cek apakah calon handle ini sudah diambil orang lain
      let candidate = initialHandle;
      let counter = 1;
      while (await isHandleTaken(candidate)) {
        candidate = `${initialHandle}${counter}`;
        counter++;
      }

      const created = await addMailboxForUser(dbUser.id, dbUser.email, candidate);
      if (created.success && created.mailbox) {
        mailboxes = [created.mailbox];
      }
    }

    const activeMailbox = mailboxes[0]?.handle || 'inbox';

    res.json({
      success: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        activeMailbox,
        mailboxes,
        createdAt: dbUser.created_at,
      },
      token: `token_${dbUser.id}`,
    });
  } catch (error) {
    console.error('Failed to verify OTP:', error);
    res.status(500).json({
      error: 'Terjadi kesalahan sistem saat verifikasi OTP',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// ==========================================
// MAILBOX MANAGEMENT (MAX 10 & GLOBAL UNIQUENESS)
// ==========================================

/**
 * Ambil semua mailbox milik user saat ini
 */
app.get('/api/user/mailboxes', async (req: Request, res: Response) => {
  try {
    const userEmail = req.query.email ? String(req.query.email).trim().toLowerCase() : '';
    const userId = req.query.userId ? String(req.query.userId).trim() : '';

    if (!userEmail && !userId) {
      res.status(400).json({ error: 'Identitas user (email atau userId) diperlukan' });
      return;
    }

    const mailboxes = await getUserMailboxes(userId, userEmail);
    res.json({
      success: true,
      count: mailboxes.length,
      maxLimit: 10,
      domain: PRIMARY_DOMAIN,
      mailboxes,
    });
  } catch (error) {
    res.status(500).json({ error: 'Gagal memuat mailbox pengguna' });
  }
});

/**
 * Tambah Mailbox Baru untuk User
 * Syarat:
 * 1. Maksimal 10 mailbox per user
 * 2. 2 user berbeda TIDAK BOLEH memiliki nama mail yang sama
 */
app.post('/api/user/mailboxes', async (req: Request, res: Response) => {
  try {
    const { userId, email, handle } = req.body;
    if (!email || !handle) {
      res.status(400).json({ error: 'Email user dan nama mailbox wajib diisi' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanUserId = userId ? String(userId).trim() : '';
    const cleanHandle = String(handle).trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');

    const result = await addMailboxForUser(cleanUserId, cleanEmail, cleanHandle);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({
      success: true,
      message: `Mailbox ${result.mailbox?.full_email} berhasil ditambahkan ke akun Anda.`,
      mailbox: result.mailbox,
    });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menambahkan mailbox baru' });
  }
});

/**
 * Hapus Mailbox User (Membebaskan kuota dari 10 slot)
 */
app.delete('/api/user/mailboxes/:handle', async (req: Request, res: Response) => {
  try {
    const { handle } = req.params;
    const { email, userId } = req.body;

    if (!email || !handle) {
      res.status(400).json({ error: 'Data tidak lengkap' });
      return;
    }

    const result = await deleteMailboxForUser(userId || '', String(email).trim().toLowerCase(), handle);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({
      success: true,
      message: `Mailbox ${handle}@${PRIMARY_DOMAIN} berhasil dihapus.`,
    });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menghapus mailbox' });
  }
});

// ==========================================
// RESEND RECEIVING API (FETCH & FILTER EMAILS)
// ==========================================

/**
 * Fetch received emails from Resend & Filter strictly according to active mailbox
 */
app.get('/api/emails/receiving', async (req: Request, res: Response) => {
  try {
    const requestedMailbox = req.query.mailbox ? String(req.query.mailbox).trim().toLowerCase() : '';

    const response = await fetch('https://api.resend.com/emails/receiving', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resend Receiving API Error:', response.status, errorText);
      res.status(response.status).json({ error: `Resend API error: ${response.statusText}`, details: errorText });
      return;
    }

    const json = (await response.json()) as {
      object: string;
      has_more?: boolean;
      data?: Array<{
        id: string;
        to: string[];
        from: string;
        created_at: string;
        subject: string;
        bcc?: string[];
        cc?: string[];
        reply_to?: string[];
        message_id?: string;
        attachments?: unknown[];
      }>;
    };

    const allEmails = json.data || [];

    // Deteksi seluruh kotak masuk yang pernah menerima email
    const foundMailboxesSet = new Set<string>();
    for (const item of allEmails) {
      if (Array.isArray(item.to)) {
        for (const recipient of item.to) {
          foundMailboxesSet.add(recipient.toLowerCase());
        }
      }
    }
    const foundMailboxes = Array.from(foundMailboxesSet);

    // Saring HANYA email yang sesuai dengan mailbox yang diminta
    let filteredEmails = allEmails;
    if (requestedMailbox && requestedMailbox !== 'all' && requestedMailbox !== '*') {
      const targetHandle = requestedMailbox.includes('@')
        ? requestedMailbox.split('@')[0]
        : requestedMailbox;
      const targetFull = `${targetHandle}@${PRIMARY_DOMAIN}`.toLowerCase();

      filteredEmails = allEmails.filter((item) => {
        if (!Array.isArray(item.to)) return false;
        return item.to.some((recipient) => {
          const rec = recipient.toLowerCase().trim();
          const recHandle = rec.includes('@') ? rec.split('@')[0] : rec;
          return rec === targetFull || recHandle === targetHandle || rec === requestedMailbox;
        });
      });
    }

    res.json({
      success: true,
      totalCount: allEmails.length,
      filteredCount: filteredEmails.length,
      currentMailbox: requestedMailbox
        ? requestedMailbox.includes('@')
          ? requestedMailbox
          : `${requestedMailbox}@${PRIMARY_DOMAIN}`
        : 'all',
      domain: PRIMARY_DOMAIN,
      foundMailboxes,
      data: filteredEmails,
    });
  } catch (error) {
    console.error('Failed to fetch receiving emails:', error);
    res.status(500).json({
      error: 'Gagal mengambil email dari server Resend',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// Fetch full single email by ID from Resend
app.get('/api/emails/receiving/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: 'Email ID is required' });
      return;
    }

    const response = await fetch(`https://api.resend.com/emails/receiving/${id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      res.status(response.status).json({ error: `Gagal memuat email: ${response.statusText}`, details: errorText });
      return;
    }

    const emailData = await response.json();
    res.json({
      success: true,
      data: emailData,
    });
  } catch (error) {
    console.error(`Failed to fetch email detail ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Gagal mengambil detail email dari server Resend',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// Kirim email dari Z-Mail menggunakan Resend
app.post('/api/emails/send', async (req: Request, res: Response) => {
  try {
    const { from, to, subject, html, text } = req.body;
    if (!to || !subject || (!html && !text)) {
      res.status(400).json({ error: 'Field penerima, subjek, dan isi pesan wajib diisi' });
      return;
    }

    const sender = from || `noreply@${PRIMARY_DOMAIN}`;
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_OTP_API_KEY || RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: sender,
        to: Array.isArray(to) ? to : [to],
        subject,
        html: html || `<p>${text}</p>`,
        text: text || undefined,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      res.status(response.status).json({ error: 'Gagal mengirim email', details: data });
      return;
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Failed to send email:', error);
    res.status(500).json({
      error: 'Server error saat mengirim email',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// Setup Vite or Static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Z-Mail] Server running on http://0.0.0.0:${PORT}`);
    console.log(`[Z-Mail] Inbound Key: ${RESEND_API_KEY.slice(0, 8)}...`);
    console.log(`[Z-Mail] OTP Sender: ${OTP_SENDER_EMAIL}`);
    console.log(`[Z-Mail] Supabase Status: ${isSupabaseConnected() ? 'CONNECTED' : 'STANDBY (In-memory sync ready)'}`);
  });
}

startServer();
