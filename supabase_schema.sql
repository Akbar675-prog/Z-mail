-- ==========================================================
-- Z-MAIL DATABASE SCHEMA FOR SUPABASE
-- Salin dan jalankan seluruh query ini di Supabase SQL Editor
-- (Dashboard -> SQL Editor -> New Query -> Run)
-- ==========================================================

-- 1. Tabel Users (Menyimpan data email pribadi pengguna seperti Gmail, Outlook, dll)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ DEFAULT now()
);

-- Index untuk pencarian cepat berdasarkan email pribadi
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 2. Tabel Mail Visora (Menyimpan alamat mail custom @visora.my.id)
-- Aturan:
-- a. UNIQUE(handle) & UNIQUE(full_email) -> 2 user berbeda TIDAK BISA memiliki handle/mail yang sama
-- b. Maksimal 10 mailbox per user (diverifikasi oleh sistem & trigger)
CREATE TABLE IF NOT EXISTS public.mail_visora (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  user_email TEXT REFERENCES public.users(email) ON DELETE CASCADE,
  handle TEXT UNIQUE NOT NULL,               -- contoh: 'me', 'verif', 'devan'
  domain TEXT NOT NULL DEFAULT 'visora.my.id',
  full_email TEXT UNIQUE NOT NULL,          -- contoh: 'me@visora.my.id'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index untuk handle & email
CREATE INDEX IF NOT EXISTS idx_mail_visora_handle ON public.mail_visora(handle);
CREATE INDEX IF NOT EXISTS idx_mail_visora_user_id ON public.mail_visora(user_id);
CREATE INDEX IF NOT EXISTS idx_mail_visora_user_email ON public.mail_visora(user_email);

-- 3. Tabel Verifikasi OTP (Menyimpan kode OTP 6 digit dan masa berlaku)
CREATE TABLE IF NOT EXISTS public.verification_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_otps_email ON public.verification_otps(email);

-- 4. Fungsi & Trigger opsional: Menjamin maksimal 10 mailbox per user di level database
CREATE OR REPLACE FUNCTION check_max_mailboxes() 
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT count(*) FROM public.mail_visora WHERE user_id = NEW.user_id) >= 10 THEN
    RAISE EXCEPTION 'User sudah mencapai batas maksimal 10 mailbox custom.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_max_mailboxes ON public.mail_visora;
CREATE TRIGGER trigger_max_mailboxes
BEFORE INSERT ON public.mail_visora
FOR EACH ROW EXECUTE FUNCTION check_max_mailboxes();

-- 5. Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_visora ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_otps ENABLE ROW LEVEL SECURITY;

-- Kebijakan akses untuk Service Role / Anon
CREATE POLICY "Allow all access to users with service role/anon" 
ON public.users FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to mail_visora with service role/anon" 
ON public.mail_visora FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to verification_otps with service role/anon" 
ON public.verification_otps FOR ALL USING (true) WITH CHECK (true);
