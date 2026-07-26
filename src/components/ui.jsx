import { useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.svg';
import SafeImage from './SafeImage';

/* ────────────────────────────────────────────────────────────────────────
   Shared UI primitives — the CollabHub design system.
   ──────────────────────────────────────────────────────────────────────── */

export function Logo({ to = '/', size = 'md', withWordmark = true }) {
  const tile = size === 'lg' ? 'w-11 h-11 rounded-2xl' : size === 'sm' ? 'w-8 h-8 rounded-lg' : 'w-9 h-9 rounded-xl';
  const img = size === 'lg' ? 'w-7 h-7' : size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';
  const word = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-lg';
  return (
    <Link to={to} className="flex items-center gap-2.5 group shrink-0">
      <div className={`sheen ${tile} bg-gradient-to-br from-primary-600 via-primary-500 to-violet-500 flex items-center justify-center shadow-glow-primary group-hover:scale-105 group-hover:rotate-3 transition-transform duration-300`}>
        <img src={logo} alt="" className={img} />
      </div>
      {withWordmark && (
        <span className={`font-display font-bold ${word} tracking-tight text-white`}>
          Collab<span className="text-gradient">Hub</span>
        </span>
      )}
    </Link>
  );
}

export function Spinner({ className = 'h-10 w-10' }) {
  return (
    <div className={`${className} rounded-full border-2 border-white/10 border-t-primary-400 animate-spin`} />
  );
}

export function PageLoader() {
  return (
    <div className="flex justify-center py-24">
      <Spinner />
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions, className = '' }) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-end justify-between gap-4 animate-fade-up ${className}`}>
      <div className="text-left">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-3xl sm:text-4xl font-bold text-white">{title}</h1>
        {subtitle && <p className="mt-2 text-slate-400 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
}

/* Segmented pill switcher — options: [{ key, label, badge? }] */
export function Segmented({ options, value, onChange, size = 'md' }) {
  const pad = size === 'sm' ? 'px-4 py-1.5 text-xs' : 'px-6 py-2.5 text-sm';
  return (
    <div className="inline-flex bg-white/[0.04] backdrop-blur-md p-1.5 rounded-2xl border border-white/10">
      {options.map(({ key, label, badge }) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`${pad} rounded-xl font-bold transition-all duration-200 flex items-center gap-2 ${active
              ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-glow-primary'
              : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            {label}
            {badge > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${active ? 'bg-white/25 text-white' : 'bg-primary-500/25 text-primary-300'}`}>
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Modal({ isOpen, onClose, title, subtitle, children, maxWidth = 'max-w-2xl', headerExtra }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div
        className={`gradient-ring bg-ink-850 rounded-2xl shadow-card w-full ${maxWidth} overflow-hidden animate-pop-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-7 py-5 border-b border-white/10 bg-white/[0.02]">
          <div className="flex justify-between items-start gap-4">
            <div className="text-left">
              <h2 className="text-xl font-bold text-white">{title}</h2>
              {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {headerExtra}
        </div>
        <div className="max-h-[78vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function Avatar({ src, name, className = 'w-10 h-10', rounded = 'rounded-full', textSize = 'text-sm', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`${className} ${rounded} overflow-hidden bg-gradient-to-br from-primary-600 to-violet-600 flex items-center justify-center shrink-0 border border-white/10 ${onClick ? 'cursor-pointer' : ''}`}
    >
      <SafeImage
        src={src}
        alt={name || ''}
        className="w-full h-full object-cover"
        fallback={<span className={`text-white ${textSize} font-bold`}>{name?.[0]?.toUpperCase() || '?'}</span>}
      />
    </div>
  );
}

export function EmptyState({ icon, title, subtitle, action, className = '' }) {
  return (
    <div className={`glass p-14 text-center ${className}`}>
      <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-slate-500">
        {icon || (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        )}
      </div>
      <p className="text-lg font-semibold text-white">{title}</p>
      {subtitle && <p className="text-sm text-slate-400 mt-1.5 max-w-md mx-auto">{subtitle}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

export function PasswordInput({ value, onChange, placeholder = 'Enter your password', name, required = true }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="field pr-12"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        )}
      </button>
    </div>
  );
}

/* ── Social auth ─────────────────────────────────────────────────────── */

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const LinkedinIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.14.92-2.063 2.063-2.063 1.14 0 2.064.923 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const DiscordIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 127.14 96.36" fill="currentColor">
    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0A105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a77.15,77.15,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60.55,31,53.88s5-11.8,11.43-11.8S53.89,46.13,53.89,52.79,48.66,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60.55,73.25,53.88s5-11.8,11.44-11.8S96.12,46.13,96.12,52.79,90.92,65.69,84.69,65.69Z" />
  </svg>
);

const XIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.627l-5.1-6.657-5.856 6.657H2.306l7.644-8.74L1.126 2.25h6.802l4.759 6.285L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117l12.926 15.644z" />
  </svg>
);

export function SocialAuthButtons({ onGoogle, onLinkedin, onDiscord, onX, disabled }) {
  const providers = [
    { label: 'Google', icon: <GoogleIcon />, onClick: onGoogle },
    { label: 'LinkedIn', icon: <LinkedinIcon />, onClick: onLinkedin },
    { label: 'Discord', icon: <DiscordIcon />, onClick: onDiscord },
    { label: 'X', icon: <XIcon />, onClick: onX },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {providers.map(({ label, icon, onClick }) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="btn-secondary py-2.5 text-xs rounded-xl"
          title={`Continue with ${label}`}
        >
          {icon}
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

export function AuthDivider({ label = 'Or continue with' }) {
  return (
    <div className="relative my-7">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-white/10" />
      </div>
      <div className="relative flex justify-center">
        <span className="px-4 bg-ink-900 text-slate-500 text-[11px] uppercase font-semibold tracking-widest">{label}</span>
      </div>
    </div>
  );
}

/* ── AuthShell — the split-screen frame shared by every auth page ────── */

const authHighlights = [
  { title: 'Verified analytics', desc: 'First-party YouTube data on every profile — no edited screenshots.' },
  { title: 'Curated discovery', desc: 'Filter creators, brands, projects and campaigns by niche and reach.' },
  { title: 'Deals, end to end', desc: 'Requests, budgets and real-time chat in one shared workspace.' },
];

export function AuthShell({ children, headerAction }) {
  return (
    <div className="min-h-screen w-full flex bg-ink-950 text-white">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col w-[44%] xl:w-2/5 relative overflow-hidden border-r border-white/[0.06] p-12">
        <div className="absolute inset-0 grid-bg" aria-hidden="true" />
        <div className="absolute -top-32 -left-32 w-[30rem] h-[30rem] rounded-full bg-primary-600/25 blur-[120px] animate-glow" aria-hidden="true" />
        <div className="absolute bottom-0 -right-24 w-96 h-96 rounded-full bg-violet-600/20 blur-[110px] animate-glow" style={{ animationDelay: '2s' }} aria-hidden="true" />

        <div className="relative z-10 flex flex-col h-full">
          <Logo />
          <div className="my-auto py-16 text-left">
            <h2 className="font-display text-4xl xl:text-[2.75rem] font-bold leading-[1.1] tracking-tight">
              Where creators &amp;<br />brands <span className="text-gradient">co-create.</span>
            </h2>
            <p className="mt-5 text-slate-400 leading-relaxed max-w-sm">
              The professional network for creator–brand partnerships — discovery, deals and delivery in one place.
            </p>
            <div className="mt-12 space-y-6">
              {authHighlights.map((h, i) => (
                <div key={h.title} className="flex gap-4 animate-fade-up" style={{ animationDelay: `${0.15 + i * 0.1}s` }}>
                  <div className="w-9 h-9 rounded-xl bg-primary-500/15 border border-primary-500/25 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{h.title}</p>
                    <p className="text-sm text-slate-400 mt-0.5">{h.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-600">© 2026 CollabHub. All rights reserved.</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex flex-col relative">
        <div className="absolute inset-0 lg:hidden grid-bg" aria-hidden="true" />
        <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 h-20 shrink-0">
          <div className="lg:hidden"><Logo /></div>
          <div className="ml-auto">{headerAction}</div>
        </header>
        <main className="relative z-10 flex-1 flex items-center justify-center px-6 sm:px-10 pb-14">
          <div className="w-full max-w-md animate-fade-up">{children}</div>
        </main>
      </div>
    </div>
  );
}
