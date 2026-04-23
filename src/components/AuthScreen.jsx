/**
 * AuthScreen.jsx
 * ─────────────────────────────────────────────────────────────
 * Handles three auth modes in a single component:
 *   login       — email + password sign in
 *   signup      — email + password registration
 *   reset       — send password reset email
 *
 * Designed to match the Nappily visual language exactly:
 * cream background, DM Serif headings, pill buttons, card inputs.
 */
import { useState } from 'react';
import { signIn, signUp, resetPassword } from '../lib/auth';
import Logo from './Logo';

// ─── Field validation ────────────────────────────────────────

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validatePassword(password) {
  return password.length >= 6;
}

// ─── Inline field error ──────────────────────────────────────

function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="text-danger-400 text-[13px] mt-1.5">{msg}</p>;
}

// ─── Status banner (success / error) ────────────────────────

function Banner({ type, msg }) {
  if (!msg) return null;
  const styles = {
    error:   'bg-danger-50 text-danger-400 border border-danger-50',
    success: 'bg-green-50  text-green-400  border border-green-50',
    info:    'bg-info-50   text-info-400   border border-info-50',
  };
  return (
    <div className={`rounded-xl px-4 py-3 text-[13px] leading-relaxed mb-4 ${styles[type]}`}>
      {msg}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────

export default function AuthScreen() {
  const [mode,      setMode]      = useState('login'); // 'login' | 'signup' | 'reset'
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [loading,   setLoading]   = useState(false);
  const [banner,    setBanner]    = useState(null);   // { type, msg }
  const [fieldErrs, setFieldErrs] = useState({});

  // ── Clear state when switching mode ───────────────────────
  function switchMode(next) {
    setMode(next);
    setBanner(null);
    setFieldErrs({});
    setPassword('');
  }

  // ── Client-side validation ─────────────────────────────────
  function validate() {
    const errs = {};
    if (!validateEmail(email))    errs.email    = 'Please enter a valid email address';
    if (mode !== 'reset' && !validatePassword(password)) {
      errs.password = 'Password must be at least 6 characters';
    }
    setFieldErrs(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Submit ─────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    setBanner(null);
    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await signIn(email.trim(), password);
        if (error) {
          // Map Supabase error messages to friendly copy
          const msg = error.message.includes('Invalid login')
            ? 'Incorrect email or password. Please try again.'
            : error.message;
          setBanner({ type: 'error', msg });
        }
        // On success, useAuth picks up the session change automatically

      } else if (mode === 'signup') {
        const { error } = await signUp(email.trim(), password);
        if (error) {
          const msg = error.message.includes('already registered')
            ? 'An account with this email already exists. Try logging in.'
            : error.message;
          setBanner({ type: 'error', msg });
        } else {
          setBanner({
            type: 'success',
            msg: 'Account created! Check your email to confirm your address, then log in.',
          });
          switchMode('login');
        }

      } else if (mode === 'reset') {
        const { error } = await resetPassword(email.trim());
        if (error) {
          setBanner({ type: 'error', msg: error.message });
        } else {
          setBanner({
            type: 'success',
            msg: `We've sent a password reset link to ${email.trim()}.`,
          });
        }
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Copy per mode ──────────────────────────────────────────
  const copy = {
    login:  { heading: 'Welcome back',       sub: 'Log in to your Nappily account.',      cta: 'Log in'       },
    signup: { heading: 'Create your account', sub: 'Start your free Nappily account.',     cta: 'Create account' },
    reset:  { heading: 'Reset your password', sub: "We'll send a link to your email.",     cta: 'Send reset link' },
  }[mode];

  return (
    <div className="fade-in flex flex-col min-h-screen px-6 pt-12 pb-10">
      <Logo />

      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
        <h1 className="font-serif text-[36px] leading-[1.1] mb-2 mt-10 tracking-[-0.5px]">
          {copy.heading}
        </h1>
        <p className="text-cream-400 text-sm mb-8">{copy.sub}</p>

        <Banner type={banner?.type} msg={banner?.msg} />

        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Email address</label>
            <input
              className={`input-field ${fieldErrs.email ? 'border-danger-400' : ''}`}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setFieldErrs(f => ({ ...f, email: '' })); }}
            />
            <FieldError msg={fieldErrs.email} />
          </div>

          {/* Password — hidden on reset mode */}
          {mode !== 'reset' && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    className="text-[13px] text-cream-400 hover:text-cream-600 transition-colors"
                    onClick={() => switchMode('reset')}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                className={`input-field ${fieldErrs.password ? 'border-danger-400' : ''}`}
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                value={password}
                onChange={e => { setPassword(e.target.value); setFieldErrs(f => ({ ...f, password: '' })); }}
              />
              <FieldError msg={fieldErrs.password} />
            </div>
          )}

          {mode === 'reset' && <div className="mb-6" />}

          {/* Submit */}
          <button
            type="submit"
            className="btn-primary flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-cream-50/40 border-t-cream-50 rounded-full animate-spin" />
                <span>Please wait…</span>
              </>
            ) : copy.cta}
          </button>
        </form>

        {/* Mode switcher */}
        <div className="mt-6 text-center">
          {mode === 'login' && (
            <p className="text-[14px] text-cream-400">
              Don't have an account?{' '}
              <button
                className="text-cream-600 font-medium underline underline-offset-2 hover:opacity-70 transition-opacity"
                onClick={() => switchMode('signup')}
              >
                Sign up
              </button>
            </p>
          )}
          {mode === 'signup' && (
            <p className="text-[14px] text-cream-400">
              Already have an account?{' '}
              <button
                className="text-cream-600 font-medium underline underline-offset-2 hover:opacity-70 transition-opacity"
                onClick={() => switchMode('login')}
              >
                Log in
              </button>
            </p>
          )}
          {mode === 'reset' && (
            <button
              className="text-[14px] text-cream-400 underline underline-offset-2 hover:opacity-70 transition-opacity"
              onClick={() => switchMode('login')}
            >
              Back to log in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
