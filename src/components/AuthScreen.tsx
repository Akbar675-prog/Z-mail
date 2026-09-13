import React, { useState, useEffect, useRef } from 'react';
import {
  Mail,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  RotateCcw,
  Edit3,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { User } from '../types';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
  domain: string;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess, domain }) => {
  // Steps: 'email' -> 'otp'
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [personalEmail, setPersonalEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [debugOtpCode, setDebugOtpCode] = useState<string | null>(null);

  // Countdown timer for OTP resend
  const [resendCountdown, setResendCountdown] = useState(0);

  // Input refs for 6-digit OTP fields
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  // Request 6-digit OTP to user's personal email
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessNotice('');
    setDebugOtpCode(null);

    const emailToVerify = personalEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailToVerify || !emailRegex.test(emailToVerify)) {
      setErrorMessage('Masukkan alamat email pribadi yang valid (contoh: nama@gmail.com atau nama@outlook.com)');
      return;
    }

    if (emailToVerify.endsWith(`@${domain.toLowerCase()}`)) {
      setErrorMessage(`Gunakan email pribadi Anda (seperti Gmail atau Outlook), bukan email @${domain}.`);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToVerify }),
      });

      const data = await res.json();

      if (!res.ok && !data.success) {
        throw new Error(data.error || 'Gagal mengirim kode OTP');
      }

      setStep('otp');
      setSuccessNotice(data.message || `Kode OTP telah dikirim ke ${emailToVerify}`);
      if (data.debugCode) {
        setDebugOtpCode(data.debugCode);
      }
      setResendCountdown(60);
      setOtpDigits(['', '', '', '', '', '']);

      // Focus first OTP field
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 150);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat mengirim OTP';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP digit change & auto focus to next box
  const handleOtpChange = (index: number, val: string) => {
    // Only numbers allowed
    const sanitized = val.replace(/\D/g, '');
    if (!sanitized) {
      const newDigits = [...otpDigits];
      newDigits[index] = '';
      setOtpDigits(newDigits);
      return;
    }

    // If pasted full 6 digit string
    if (sanitized.length >= 6) {
      const pasted = sanitized.slice(0, 6).split('');
      setOtpDigits(pasted);
      otpRefs.current[5]?.focus();
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = sanitized[sanitized.length - 1]; // take last char
    setOtpDigits(newDigits);

    // Auto move to next input
    if (index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length > 0) {
      const newDigits = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pastedData[i] || '';
      }
      setOtpDigits(newDigits);
      const nextFocus = Math.min(pastedData.length, 5);
      otpRefs.current[nextFocus]?.focus();
    }
  };

  // Submit OTP verification
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    const code = otpDigits.join('');

    if (code.length < 6) {
      setErrorMessage('Silakan lengkapi 6 digit kode verifikasi OTP');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: personalEmail.trim().toLowerCase(),
          otpCode: code,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Kode OTP tidak cocok atau kadaluarsa');
      }

      onLoginSuccess(data.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal verifikasi kode OTP';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const fillDebugCode = () => {
    if (debugOtpCode && debugOtpCode.length === 6) {
      setOtpDigits(debugOtpCode.split(''));
    }
  };

  return (
    <div id="zmail-auth-container" className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-600 text-white shadow-lg shadow-red-200 mb-4 ring-4 ring-red-100">
          <Mail className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Z-Mail</h1>
        <p className="mt-2 text-sm text-slate-600">
          Email Pribadi Gratis & Tanpa Batas Waktu di <span className="font-semibold text-red-600">@{domain}</span>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/70 rounded-2xl border border-slate-200">
          {/* STEP 1: INPUT PERSONAL EMAIL */}
          {step === 'email' && (
            <div>
              <div className="mb-6 text-center">
                <h2 className="text-lg font-bold text-slate-900">Masuk / Daftar Akun</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Masukkan email pribadi Anda (seperti <strong className="text-slate-700">@gmail.com</strong> atau{' '}
                  <strong className="text-slate-700">@outlook.com</strong>) untuk menerima kode OTP 6 digit.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email Pribadi Anda
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      id="input-personal-email"
                      type="email"
                      required
                      autoFocus
                      value={personalEmail}
                      onChange={(e) => setPersonalEmail(e.target.value)}
                      placeholder="contoh: nama.anda@gmail.com"
                      className="block w-full pl-11 pr-3 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all font-medium placeholder:text-slate-400"
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Kode verifikasi dikirim oleh: <strong className="text-slate-700">no-reply@verification.visora.my.id</strong></span>
                  </div>
                </div>

                <button
                  type="submit"
                  id="btn-send-otp"
                  disabled={isLoading || !personalEmail.trim()}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 shadow-md shadow-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      Mengirim Kode OTP...
                    </span>
                  ) : (
                    <>
                      <span>Kirim Kode OTP (6 Digit)</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Sample demo clicks */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Contoh Cepat (Klik untuk Coba):
                </p>
                <div className="flex flex-wrap gap-2">
                  {['devan@gmail.com', 'user.visora@outlook.com', 'akbar@gmail.com'].map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => setPersonalEmail(sample)}
                      className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-colors"
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: INPUT 6-DIGIT OTP */}
          {step === 'otp' && (
            <div>
              <div className="mb-5 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-3">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Verifikasi 6 Digit OTP</h2>
                <div className="mt-1.5 flex items-center justify-center gap-1.5 text-xs text-slate-600">
                  <span>Dikirim ke: <strong className="text-slate-900">{personalEmail}</strong></span>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('email');
                      setErrorMessage('');
                    }}
                    className="text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-0.5 ml-1"
                    title="Ubah email"
                  >
                    <Edit3 className="w-3 h-3" /> Ubah
                  </button>
                </div>
              </div>

              {successNotice && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successNotice}</span>
                </div>
              )}

              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {debugOtpCode && (
                <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Kode OTP: <strong className="font-mono text-sm tracking-wider text-amber-950">{debugOtpCode}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={fillDebugCode}
                    className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold text-[11px] transition-colors"
                  >
                    Isi Otomatis
                  </button>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                {/* 6 Digits Boxes */}
                <div className="flex justify-between items-center gap-2 sm:gap-2.5">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpRefs.current[idx] = el;
                      }}
                      id={`input-otp-${idx}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      onPaste={handlePaste}
                      className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black font-mono bg-slate-50 border-2 border-slate-300 focus:border-red-600 focus:bg-white focus:outline-none rounded-xl text-slate-900 transition-all shadow-xs"
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  id="btn-verify-otp"
                  disabled={isLoading || otpDigits.join('').length < 6}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 shadow-md shadow-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      Memverifikasi...
                    </span>
                  ) : (
                    <>
                      <span>Verifikasi & Masuk Akun</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Resend OTP */}
              <div className="mt-5 text-center">
                {resendCountdown > 0 ? (
                  <p className="text-xs text-slate-400">
                    Kirim ulang kode dalam <span className="font-semibold text-slate-600">{resendCountdown}s</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRequestOtp()}
                    disabled={isLoading}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 transition-colors inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Kirim Ulang Kode OTP
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* System Benefits & Rules */}
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col items-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-1" />
            <span className="text-xs font-semibold text-slate-800">Maks. 10 Mailbox</span>
            <span className="text-[11px] text-slate-500">Per akun user</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col items-center">
            <Zap className="w-5 h-5 text-amber-500 mb-1" />
            <span className="text-xs font-semibold text-slate-800">Nama Unik</span>
            <span className="text-[11px] text-slate-500">Bebas bentrok</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col items-center">
            <ShieldCheck className="w-5 h-5 text-blue-500 mb-1" />
            <span className="text-xs font-semibold text-slate-800">OTP Resmi</span>
            <span className="text-[11px] text-slate-500">Resend Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
};
