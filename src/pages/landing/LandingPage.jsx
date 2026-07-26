import { Link } from 'react-router-dom';
import { Logo } from '../../components/ui';

/* ── Content ─────────────────────────────────────────────────────────── */

const steps = [
  {
    n: '01',
    title: 'Build your profile',
    desc: 'Sign up as a creator or brand, connect your YouTube channel, and showcase your work with real, verified analytics.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    ),
  },
  {
    n: '02',
    title: 'Discover & connect',
    desc: 'Browse creator projects and brand campaigns, filter by niche, platform and audience, and find the perfect match.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
    ),
  },
  {
    n: '03',
    title: 'Collaborate',
    desc: 'Send a collaboration request, agree on budget and timeline, then chat in real time to bring the partnership to life.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.9 9.9 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    ),
  },
];

const marqueeTags = [
  'Gaming', 'Beauty', 'Tech Reviews', 'Fitness', 'Education', 'Comedy', 'Music',
  'Travel', 'Food', 'Fashion', 'Productivity', 'Finance', 'Lifestyle', 'Sports',
];

const stats = [
  { value: '4.2×', label: 'Faster deal cycles' },
  { value: '92%', label: 'Verified analytics coverage' },
  { value: '30s', label: 'To send a collab request' },
  { value: '1', label: 'Workspace for everything' },
];

/* ── Page ────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-ink-950 text-white overflow-x-hidden text-left">
      {/* Ambient animated backdrop */}
      <div className="aurora" aria-hidden="true">
        <span className="w-[38rem] h-[38rem] -top-40 -left-32 bg-primary-600/20 animate-float" />
        <span className="w-[32rem] h-[32rem] top-[40%] -right-40 bg-violet-600/15 animate-glow" style={{ animationDelay: '1.5s' }} />
        <span className="w-[28rem] h-[28rem] bottom-0 left-1/4 bg-cyan-500/10 animate-float" style={{ animationDelay: '3s' }} />
      </div>

      <div className="relative z-10">
        {/* ── Nav ─────────────────────────────────────────────── */}
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-ink-950/70 border-b border-white/[0.07]">
          <nav className="max-w-7xl mx-auto px-6 h-[4.5rem] flex items-center justify-between gap-4">
            <Logo />
            <div className="hidden md:flex items-center gap-9 text-sm font-medium text-slate-300">
              <a href="#top" className="hover:text-white transition-colors">Home</a>
              <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
              <a href="#features" className="hover:text-white transition-colors">Features</a>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link to="/login" className="btn-ghost btn-md">Log In</Link>
              <Link to="/register" className="btn-primary btn-md">
                Get Started
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
            </div>
          </nav>
        </header>

        {/* ── Hero ────────────────────────────────────────────── */}
        <section id="top" className="relative scroll-mt-24">
          <div className="absolute inset-0 grid-bg" aria-hidden="true" />
          <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-2 gap-16 items-center">
            <div className="stagger-children text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/25 text-primary-300 text-xs font-bold uppercase tracking-widest">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-400" />
                </span>
                Now in Private Beta
              </div>

              <h1 className="mt-7 font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.02]">
                The deal desk for the{' '}
                <span className="text-gradient">creator economy.</span>
              </h1>

              <p className="mt-7 text-lg text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                CollabHub is where creators and brands post work, discover each
                other, negotiate collaborations and deliver together — backed by
                verified first-party analytics.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link to="/register" className="btn-primary btn-lg">
                  Join as Creator
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </Link>
                <Link to="/register" className="btn-secondary btn-lg">
                  Join as Brand
                </Link>
              </div>

              <div className="mt-12 flex items-center gap-4 justify-center lg:justify-start">
                <div className="flex -space-x-3">
                  {[['A', 'from-primary-500 to-cyan-500'], ['M', 'from-violet-500 to-fuchsia-500'], ['K', 'from-amber-500 to-orange-500']].map(([ch, grad]) => (
                    <div key={ch} className={`w-10 h-10 rounded-full border-2 border-ink-950 bg-gradient-to-br ${grad} flex items-center justify-center text-sm font-bold`}>{ch}</div>
                  ))}
                  <div className="w-10 h-10 rounded-full border-2 border-ink-950 bg-white/10 backdrop-blur flex items-center justify-center text-[10px] font-bold text-slate-300">+1k</div>
                </div>
                <p className="text-sm text-slate-400">
                  <span className="text-white font-bold">Creators &amp; brands</span> building together
                </p>
              </div>
            </div>

            {/* Hero visual — glass analytics mockup */}
            <div className="relative animate-fade-up" style={{ animationDelay: '.2s' }}>
              <div className="absolute -inset-8 bg-gradient-to-tr from-primary-600/25 via-violet-600/10 to-transparent blur-3xl opacity-70" />

              <div className="gradient-ring relative rounded-3xl bg-ink-850/80 backdrop-blur-xl p-6 shadow-card">
                {/* Channel header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center font-bold">A</div>
                  <div>
                    <p className="font-semibold text-sm">Aria Chen</p>
                    <p className="text-xs text-slate-400">Creator · 248K subscribers</p>
                  </div>
                  <span className="ml-auto inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Verified
                  </span>
                </div>

                {/* Stat tiles */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[['Reach', '1.2M', 'text-primary-300'], ['Engage', '8.4%', 'text-emerald-300'], ['Avg Views', '96K', 'text-violet-300']].map(([label, val, color]) => (
                    <div key={label} className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
                      <p className={`text-lg font-bold font-display ${color}`}>{val}</p>
                    </div>
                  ))}
                </div>

                {/* Mini chart */}
                <div className="rounded-xl bg-black/25 border border-white/[0.06] p-4">
                  <p className="text-xs text-slate-400 mb-2">Views · last 30 days</p>
                  <svg viewBox="0 0 300 90" className="w-full h-24" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="heroChart" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6478ff" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#6478ff" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0,72 C30,62 50,36 80,42 C110,48 130,20 170,28 C210,36 245,12 300,22 L300,90 L0,90 Z" fill="url(#heroChart)" />
                    <path d="M0,72 C30,62 50,36 80,42 C110,48 130,20 170,28 C210,36 245,12 300,22" fill="none" stroke="#8290ff" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              {/* Floating accent cards */}
              <div className="absolute -left-4 sm:-left-8 top-1/4 animate-float rounded-xl border border-white/10 bg-ink-850/90 backdrop-blur-md p-3 shadow-card flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Campaign Growth</p>
                  <p className="text-sm font-bold text-white">+142% Reach</p>
                </div>
              </div>

              <div className="absolute -right-3 sm:-right-6 bottom-8 animate-float rounded-xl border border-white/10 bg-ink-850/90 backdrop-blur-md p-3 shadow-card flex items-center gap-3" style={{ animationDelay: '2s' }}>
                <div className="w-9 h-9 rounded-lg bg-primary-500/15 flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">New request</p>
                  <p className="text-sm font-bold text-white">Brand collab 🤝</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Category marquee ────────────────────────────────── */}
        <section className="border-y border-white/[0.06] bg-white/[0.015] py-5 overflow-hidden" aria-hidden="true">
          <div className="flex w-max animate-marquee gap-3">
            {[...marqueeTags, ...marqueeTags].map((tag, i) => (
              <span key={i} className="chip-neutral px-4 py-2 text-sm rounded-full">{tag}</span>
            ))}
          </div>
        </section>

        {/* ── Stats band ──────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="stagger-children grid grid-cols-2 lg:grid-cols-4 gap-5">
            {stats.map(({ value, label }) => (
              <div key={label} className="glass p-7 text-center">
                <p className="font-display text-4xl font-bold text-gradient">{value}</p>
                <p className="mt-2 text-sm text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ────────────────────────────────────── */}
        <section id="how-it-works" className="scroll-mt-24 border-y border-white/[0.06] bg-white/[0.015]">
          <div className="max-w-7xl mx-auto px-6 py-24">
            <div className="text-center max-w-2xl mx-auto animate-fade-up">
              <p className="eyebrow">How it works</p>
              <h2 className="mt-3 font-display text-3xl sm:text-5xl font-bold tracking-tight">Simple. Transparent. Powerful.</h2>
              <p className="mt-5 text-slate-400 text-lg">
                We removed the friction from creator marketing so you can focus on what matters — authentic partnerships that perform.
              </p>
            </div>

            <div className="stagger-children mt-16 grid gap-6 md:grid-cols-3">
              {steps.map((s, i) => (
                <div key={s.n} className="hover-lift relative glass card-hover p-8">
                  <span className="absolute top-6 right-7 font-display text-5xl font-bold text-white/[0.05] select-none">{s.n}</span>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500/15 to-violet-500/10 border border-primary-500/20 flex items-center justify-center mb-6">
                    <svg className="w-6 h-6 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">{s.icon}</svg>
                  </div>
                  <p className="eyebrow mb-2">Step {s.n}</p>
                  <h3 className="text-xl font-bold mb-2">{s.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{s.desc}</p>
                  {i < steps.length - 1 && (
                    <svg className="hidden md:block absolute top-1/2 -right-6 w-6 h-6 text-slate-600 z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features bento ──────────────────────────────────── */}
        <section id="features" className="scroll-mt-24 max-w-7xl mx-auto px-6 py-24">
          <div className="max-w-2xl animate-fade-up">
            <p className="eyebrow">The platform</p>
            <h2 className="mt-3 font-display text-3xl sm:text-5xl font-bold tracking-tight leading-tight">
              Professional tools for{' '}
              <span className="text-gradient">professional partnerships.</span>
            </h2>
            <p className="mt-5 text-lg text-slate-400 leading-relaxed">
              Stop juggling DMs, spreadsheets and screenshots. CollabHub gives
              creators and brands one workspace where discovery, requests,
              messaging and analytics live together.
            </p>
          </div>

          <div className="stagger-children mt-14 grid md:grid-cols-6 gap-5">
            {/* Verified analytics — large */}
            <div className="hover-lift glass card-hover p-8 md:col-span-4 relative overflow-hidden">
              <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-primary-600/15 blur-3xl" />
              <svg className="w-8 h-8 text-primary-300 mb-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3v18h18M7 14l3-4 3 3 5-7" /></svg>
              <h3 className="text-2xl font-bold mb-2">Verified analytics</h3>
              <p className="text-slate-400 leading-relaxed max-w-lg">
                Connect YouTube for first-party audience insights — subscribers, views, traffic
                sources, devices and demographics rendered live on every profile. No edited screenshots, ever.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {['Views trend', 'Audience age', 'Gender split', 'Top regions', 'Devices'].map(t => (
                  <span key={t} className="chip-indigo">{t}</span>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="hover-lift glass card-hover p-8 md:col-span-2">
              <svg className="w-8 h-8 text-violet-300 mb-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" /></svg>
              <h3 className="text-xl font-bold mb-2">Powerful search</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                Filter creators, brands, projects and campaigns by genre, platform and audience.
              </p>
            </div>

            {/* Messaging */}
            <div className="hover-lift glass card-hover p-8 md:col-span-2">
              <svg className="w-8 h-8 text-cyan-300 mb-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
              <h3 className="text-xl font-bold mb-2">Real-time messaging</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                Once a request is accepted, chat instantly to plan every detail together.
              </p>
            </div>

            {/* Portfolio — large */}
            <div className="hover-lift glass card-hover p-8 md:col-span-4 relative overflow-hidden">
              <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-violet-600/15 blur-3xl" />
              <svg className="w-8 h-8 text-emerald-300 mb-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 7h18M3 7l2-3h14l2 3M3 7v11a2 2 0 002 2h14a2 2 0 002-2V7" /></svg>
              <h3 className="text-2xl font-bold mb-2">Your portfolio, your storefront</h3>
              <p className="text-slate-400 leading-relaxed max-w-lg">
                A profile that showcases your projects, campaigns, past partners and reach in one
                place — with built-in collaboration requests, budgets and timelines so deals start with one click.
              </p>
              <ul className="mt-6 space-y-2.5">
                {['Real YouTube analytics on every profile', 'Built-in collaboration requests & inbox', 'Budget and timeline on every deal'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-6 pb-24">
          <div className="gradient-ring relative overflow-hidden rounded-3xl bg-ink-850/70 backdrop-blur-xl px-6 py-20 text-center">
            <div className="absolute inset-0 grid-bg" />
            <div className="absolute -top-20 -left-24 w-72 h-72 rounded-full bg-primary-600/20 blur-3xl" />
            <div className="absolute -bottom-20 -right-24 w-72 h-72 rounded-full bg-violet-600/20 blur-3xl" />
            <div className="relative">
              <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight max-w-2xl mx-auto leading-tight">
                Ready to start your next <span className="text-gradient">collaboration?</span>
              </h2>
              <p className="mt-5 text-lg text-slate-400 max-w-xl mx-auto">
                Join the creators and brands already building partnerships on CollabHub.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/register" className="btn-primary btn-lg px-9">Join Us Today</Link>
                <Link to="/login" className="btn-secondary btn-lg px-9">Sign In</Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────────────── */}
        <footer id="footer" className="scroll-mt-24 border-t border-white/[0.07]">
          <div className="max-w-7xl mx-auto px-6 py-14 grid gap-10 md:grid-cols-4">
            <div className="md:col-span-2">
              <Logo />
              <p className="mt-4 text-sm text-slate-500 max-w-sm leading-relaxed">
                The professional network for creator–brand partnerships. Discover, negotiate and deliver — in one workspace.
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Product</p>
              <div className="flex flex-col gap-2.5 text-sm text-slate-400">
                <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
                <a href="#features" className="hover:text-white transition-colors">Features</a>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Get started</p>
              <div className="flex flex-col gap-2.5 text-sm text-slate-400">
                <Link to="/register" className="hover:text-white transition-colors">Create an account</Link>
                <Link to="/login" className="hover:text-white transition-colors">Sign in</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-white/[0.06]">
            <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-sm text-slate-600">© 2026 CollabHub. All rights reserved.</p>
              <p className="text-xs text-slate-600">Made for the creator economy.</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
