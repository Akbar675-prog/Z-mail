import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface DbUser {
  id: string;
  email: string;
  created_at: string;
  last_login: string;
}

export interface DbMailbox {
  id: string;
  user_id: string;
  user_email: string;
  handle: string;
  domain: string;
  full_email: string;
  created_at: string;
}

export interface DbOtp {
  id: string;
  email: string;
  otp_code: string;
  expires_at: string;
  verified: boolean;
  created_at: string;
}

const PRIMARY_DOMAIN = process.env.RESEND_DOMAIN || 'visora.my.id';

// In-memory fallback stores
const memoryUsers = new Map<string, DbUser>(); // key: email
const memoryMailboxes = new Map<string, DbMailbox>(); // key: handle (lowercased)
const memoryOtps = new Map<string, DbOtp>(); // key: email

// Seed an initial demo mailbox for testing if needed
const seedDemoMailbox = (userEmail: string, handle: string) => {
  const user: DbUser = {
    id: 'usr_demo_1',
    email: userEmail,
    created_at: new Date().toISOString(),
    last_login: new Date().toISOString(),
  };
  memoryUsers.set(userEmail.toLowerCase(), user);

  const mbox: DbMailbox = {
    id: 'mbox_demo_1',
    user_id: user.id,
    user_email: user.email,
    handle: handle.toLowerCase(),
    domain: PRIMARY_DOMAIN,
    full_email: `${handle.toLowerCase()}@${PRIMARY_DOMAIN}`,
    created_at: new Date().toISOString(),
  };
  memoryMailboxes.set(handle.toLowerCase(), mbox);
};

seedDemoMailbox('demo@example.com', 'devan');

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;

  if (url && key && url.trim().startsWith('http') && key.trim().length > 10) {
    if (!supabaseInstance) {
      try {
        supabaseInstance = createClient(url.trim(), key.trim());
        console.log('[Supabase] Initialized client successfully with URL:', url);
      } catch (err) {
        console.error('[Supabase] Initialization error:', err);
      }
    }
    return supabaseInstance;
  }
  return null;
}

export function isSupabaseConnected(): boolean {
  return Boolean(getSupabaseClient());
}

/**
 * Simpan OTP verifikasi
 */
export async function saveOtp(email: string, otpCode: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 menit

  // Simpan di memory fallback
  memoryOtps.set(cleanEmail, {
    id: `otp_${Date.now()}`,
    email: cleanEmail,
    otp_code: otpCode,
    expires_at: expiresAt,
    verified: false,
    created_at: new Date().toISOString(),
  });

  const sb = getSupabaseClient();
  if (sb) {
    try {
      const { error } = await sb.from('verification_otps').insert({
        email: cleanEmail,
        otp_code: otpCode,
        expires_at: expiresAt,
        verified: false,
      });
      if (error) {
        console.warn('[Supabase] Gagal menyimpan OTP di tabel verification_otps:', error.message);
      }
    } catch (e) {
      console.warn('[Supabase] Exception saat saveOtp:', e);
    }
  }

  return true;
}

/**
 * Verifikasi OTP
 */
export async function verifyOtpCode(email: string, otpCode: string): Promise<{ success: boolean; message?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = otpCode.trim();

  const sb = getSupabaseClient();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('verification_otps')
        .select('*')
        .eq('email', cleanEmail)
        .eq('otp_code', cleanCode)
        .eq('verified', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const isExpired = new Date(data.expires_at).getTime() < Date.now();
        if (isExpired) {
          return { success: false, message: 'Kode OTP telah kadaluarsa. Silakan minta kode baru.' };
        }

        // Tandai sudah diverifikasi
        await sb.from('verification_otps').update({ verified: true }).eq('id', data.id);
        return { success: true };
      }
    } catch (e) {
      console.warn('[Supabase] Exception saat verifyOtpCode, fallback ke memori:', e);
    }
  }

  // Fallback ke memori
  const saved = memoryOtps.get(cleanEmail);
  if (!saved) {
    return { success: false, message: 'Kode OTP tidak ditemukan atau belum diminta.' };
  }

  if (saved.otp_code !== cleanCode) {
    return { success: false, message: 'Kode OTP salah. Pastikan 6 digit sesuai dengan yang dikirim ke email Anda.' };
  }

  if (new Date(saved.expires_at).getTime() < Date.now()) {
    return { success: false, message: 'Kode OTP telah kadaluarsa. Silakan minta kode baru.' };
  }

  saved.verified = true;
  return { success: true };
}

/**
 * Dapatkan atau buat pengguna berdasarkan email pribadi
 */
export async function getOrCreateUser(email: string): Promise<DbUser> {
  const cleanEmail = email.trim().toLowerCase();
  const sb = getSupabaseClient();

  if (sb) {
    try {
      const { data: existingUser } = await sb
        .from('users')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (existingUser) {
        // Update last_login
        await sb.from('users').update({ last_login: new Date().toISOString() }).eq('id', existingUser.id);
        return existingUser as DbUser;
      }

      // Buat user baru
      const { data: newUser, error: createError } = await sb
        .from('users')
        .insert({ email: cleanEmail, last_login: new Date().toISOString() })
        .select()
        .single();

      if (!createError && newUser) {
        return newUser as DbUser;
      }
    } catch (e) {
      console.warn('[Supabase] Exception saat getOrCreateUser:', e);
    }
  }

  // Fallback memory
  let user = memoryUsers.get(cleanEmail);
  if (!user) {
    user = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email: cleanEmail,
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString(),
    };
    memoryUsers.set(cleanEmail, user);
  } else {
    user.last_login = new Date().toISOString();
  }

  return user;
}

/**
 * Ambil daftar mailbox custom milik user tertentu
 */
export async function getUserMailboxes(userId: string, userEmail: string): Promise<DbMailbox[]> {
  const cleanEmail = userEmail.trim().toLowerCase();
  const sb = getSupabaseClient();

  if (sb) {
    try {
      const { data, error } = await sb
        .from('mail_visora')
        .select('*')
        .or(`user_id.eq.${userId},user_email.eq.${cleanEmail}`)
        .order('created_at', { ascending: true });

      if (!error && data) {
        return data as DbMailbox[];
      }
    } catch (e) {
      console.warn('[Supabase] Exception saat getUserMailboxes:', e);
    }
  }

  // Fallback memory
  const list: DbMailbox[] = [];
  for (const mbox of memoryMailboxes.values()) {
    if (mbox.user_id === userId || mbox.user_email.toLowerCase() === cleanEmail) {
      list.push(mbox);
    }
  }
  return list;
}

/**
 * Cek apakah sebuah handle mailbox sudah diambil oleh SIAPAPUN (Global Uniqueness)
 */
export async function isHandleTaken(handle: string): Promise<boolean> {
  const cleanHandle = handle.trim().toLowerCase();
  const sb = getSupabaseClient();

  if (sb) {
    try {
      const { data } = await sb
        .from('mail_visora')
        .select('id, handle')
        .eq('handle', cleanHandle)
        .maybeSingle();

      if (data) return true;
    } catch (e) {
      console.warn('[Supabase] Exception saat isHandleTaken:', e);
    }
  }

  return memoryMailboxes.has(cleanHandle);
}

/**
 * Tambah mailbox custom untuk user
 * ATURAN BISNIS:
 * 1. Maksimal 10 mailbox per user
 * 2. Handle harus unik secara global (2 user tidak boleh punya domain mail yang sama)
 */
export async function addMailboxForUser(
  userId: string,
  userEmail: string,
  handle: string
): Promise<{ success: boolean; mailbox?: DbMailbox; error?: string }> {
  const cleanEmail = userEmail.trim().toLowerCase();
  const cleanHandle = handle.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');

  if (!cleanHandle || cleanHandle.length < 2) {
    return { success: false, error: 'Nama mailbox minimal 2 karakter (huruf, angka, titik, strip)' };
  }

  if (cleanHandle.length > 30) {
    return { success: false, error: 'Nama mailbox maksimal 30 karakter' };
  }

  // Cek Aturan 1: Maksimal 10 mailbox per user
  const currentMailboxes = await getUserMailboxes(userId, cleanEmail);
  if (currentMailboxes.length >= 10) {
    return {
      success: false,
      error: 'Batas maksimal 10 mailbox per akun telah tercapai. Silakan hapus mailbox lama untuk menambah baru.',
    };
  }

  // Cek apakah user ini sendiri sudah punya mailbox ini
  const alreadyOwnedByUser = currentMailboxes.some((m) => m.handle.toLowerCase() === cleanHandle);
  if (alreadyOwnedByUser) {
    return {
      success: false,
      error: `Mailbox '${cleanHandle}@${PRIMARY_DOMAIN}' sudah ada di akun Anda.`,
    };
  }

  // Cek Aturan 2: Keunikan global (2 user berbeda TIDAK BOLEH memiliki nama mail yang sama!)
  const taken = await isHandleTaken(cleanHandle);
  if (taken) {
    return {
      success: false,
      error: `Alamat '${cleanHandle}@${PRIMARY_DOMAIN}' sudah digunakan oleh pengguna lain. Silakan pilih nama lain.`,
    };
  }

  const fullEmail = `${cleanHandle}@${PRIMARY_DOMAIN}`;
  const newMailbox: DbMailbox = {
    id: `mbox_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    user_id: userId,
    user_email: cleanEmail,
    handle: cleanHandle,
    domain: PRIMARY_DOMAIN,
    full_email: fullEmail,
    created_at: new Date().toISOString(),
  };

  const sb = getSupabaseClient();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('mail_visora')
        .insert({
          user_id: userId,
          user_email: cleanEmail,
          handle: cleanHandle,
          domain: PRIMARY_DOMAIN,
          full_email: fullEmail,
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }
      if (data) {
        // Sinkronisasi memori juga
        memoryMailboxes.set(cleanHandle, data as DbMailbox);
        return { success: true, mailbox: data as DbMailbox };
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { success: false, error: msg };
    }
  }

  // Fallback simpan ke memory
  memoryMailboxes.set(cleanHandle, newMailbox);
  return { success: true, mailbox: newMailbox };
}

/**
 * Hapus mailbox custom milik user (agar bisa membebaskan kuota dari 10 slot)
 */
export async function deleteMailboxForUser(
  userId: string,
  userEmail: string,
  handle: string
): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = userEmail.trim().toLowerCase();
  const cleanHandle = handle.trim().toLowerCase();

  const currentMailboxes = await getUserMailboxes(userId, cleanEmail);
  if (currentMailboxes.length <= 1) {
    return {
      success: false,
      error: 'Anda harus memiliki minimal 1 mailbox aktif pada akun.',
    };
  }

  const sb = getSupabaseClient();
  if (sb) {
    try {
      const { error } = await sb
        .from('mail_visora')
        .delete()
        .eq('handle', cleanHandle)
        .or(`user_id.eq.${userId},user_email.eq.${cleanEmail}`);

      if (error) {
        return { success: false, error: error.message };
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { success: false, error: msg };
    }
  }

  // Memory delete
  const existing = memoryMailboxes.get(cleanHandle);
  if (existing && (existing.user_id === userId || existing.user_email.toLowerCase() === cleanEmail)) {
    memoryMailboxes.delete(cleanHandle);
  }

  return { success: true };
}
