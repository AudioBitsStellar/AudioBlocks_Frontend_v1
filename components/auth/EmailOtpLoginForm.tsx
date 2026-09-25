'use client';

// #463 — EmailOtpLoginForm implements the email → OTP two-step login flow via
// Privy's sendCode / loginWithCode APIs so users can authenticate without a
// wallet or OAuth provider.
//
// Usage:
//   import EmailOtpLoginForm from '@/components/auth/EmailOtpLoginForm';
//   <EmailOtpLoginForm onSuccess={() => router.push('/dashboard')} />

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';

type Step = 'email' | 'otp' | 'done';

interface Props {
  onSuccess?: () => void;
}

export default function EmailOtpLoginForm({ onSuccess }: Props) {
  const { sendCode, loginWithCode } = usePrivy();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await sendCode({ email });
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginWithCode({ code });
      setStep('done');
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'done') {
    return <p className="text-sm text-green-500">Logged in successfully!</p>;
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-sm">
      {step === 'email' ? (
        <form onSubmit={handleSendCode} className="flex flex-col gap-3">
          <label className="text-sm font-medium" htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-600"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Sending…' : 'Send code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyCode} className="flex flex-col gap-3">
          <p className="text-sm text-foreground/70">
            Enter the 6-digit code sent to <strong>{email}</strong>.
          </p>
          <label className="text-sm font-medium" htmlFor="otp">
            One-time code
          </label>
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            className="px-3 py-2 rounded-lg border border-border bg-background text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-violet-600"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Verifying…' : 'Verify code'}
          </button>
          <button
            type="button"
            onClick={() => { setStep('email'); setCode(''); setError(''); }}
            className="text-xs text-foreground/50 hover:underline"
          >
            Use a different email
          </button>
        </form>
      )}
    </div>
  );
}
