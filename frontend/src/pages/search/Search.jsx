import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import SafeImage from '../../components/SafeImage';
import { PageHeader, Segmented, Avatar, EmptyState } from '../../components/ui';

// Preset filter values (mirror the options offered when creating projects/campaigns)
const GENRE_OPTIONS = ['Action', 'Adventure', 'RPG', 'Strategy', 'Simulation', 'Casual', 'Puzzle', 'Sports', 'Productivity', 'Education', 'Comedy', 'Drama'];
const PLATFORM_OPTIONS = ['iOS', 'Android', 'Web', 'Windows', 'Mac', 'Linux', 'PlayStation', 'Xbox', 'Nintendo Switch'];
const AUDIENCE_OPTIONS = ['Teenagers', 'Adults', 'Professionals', 'Kids', 'Students', 'Gaming Enthusiasts', 'Artists', 'Businesses'];

// target_aud / genre / platforms are text columns that hold JSON-encoded strings.
const safeJsonParse = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [value];
    }
  }
  return [];
};

// A row of clickable preset chips that toggle on/off.
function ChipFilter({ label, options, selected, onToggle }) {
  return (
    <div className="text-left">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2.5">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${active
                ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white border-primary-400/40 shadow-glow-primary'
                : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white'
                }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Search() {
  const navigate = useNavigate();

  const [mode, setMode] = useState('people'); // 'people' | 'content'
  const [peopleTab, setPeopleTab] = useState('creators'); // 'creators' | 'brands'
  const [contentTab, setContentTab] = useState('projects'); // 'projects' | 'campaigns'

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Content filters
  const [genreFilter, setGenreFilter] = useState([]);
  const [platformFilter, setPlatformFilter] = useState([]);
  const [audienceFilter, setAudienceFilter] = useState([]);
  // People filters
  const [hasAvatar, setHasAvatar] = useState(false);
  const [hasBio, setHasBio] = useState(false);
  // Shared
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'name'

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, peopleTab, contentTab]);

  const fetchData = async () => {
    setLoading(true);
    let query;

    if (mode === 'people') {
      query = supabase
        .from(peopleTab)
        .select('*, users(id, display_name, role, avatar, bio, email)')
        .order('created_at', { ascending: false });
    } else if (contentTab === 'projects') {
      query = supabase
        .from('projects')
        .select('*, creators(id, user_id, users(id, display_name, role, avatar))')
        .order('created_at', { ascending: false });
    } else {
      query = supabase
        .from('campaigns')
        .select('*, brands(id, user_id, users(id, display_name, role, avatar))')
        .order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    if (!error && data) {
      setItems(data);
    } else {
      if (error) console.error('Error fetching search results:', error);
      setItems([]);
    }
    setLoading(false);
  };

  const toggle = (setter) => (value) =>
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  const clearFilters = () => {
    setGenreFilter([]);
    setPlatformFilter([]);
    setAudienceFilter([]);
    setHasAvatar(false);
    setHasBio(false);
    setSortBy('newest');
  };

  const activeFilterCount = useMemo(() => {
    if (mode === 'people') {
      return (hasAvatar ? 1 : 0) + (hasBio ? 1 : 0) + (sortBy !== 'newest' ? 1 : 0);
    }
    return genreFilter.length + platformFilter.length + audienceFilter.length + (sortBy !== 'newest' ? 1 : 0);
  }, [mode, hasAvatar, hasBio, genreFilter, platformFilter, audienceFilter, sortBy]);

  const getContentName = (item) => (contentTab === 'projects' ? item.project_name : item.campaign_name);
  const getContentOwner = (item) => (contentTab === 'projects' ? item.creators?.users : item.brands?.users);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list;

    if (mode === 'people') {
      list = items.filter((item) => {
        const user = item.users;
        if (!user) return false;
        if (hasAvatar && !user.avatar) return false;
        if (hasBio && !user.bio) return false;
        if (q) {
          const hay = `${user.display_name || ''} ${user.email || ''} ${user.bio || ''} ${user.role || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
    } else {
      list = items.filter((item) => {
        const name = (getContentName(item) || '').toLowerCase();
        const desc = (item.description || '').toLowerCase();
        if (q && !name.includes(q) && !desc.includes(q)) return false;

        const genres = safeJsonParse(item.genre).map((s) => String(s).toLowerCase());
        const plats = safeJsonParse(item.platforms).map((s) => String(s).toLowerCase());
        const auds = safeJsonParse(item.target_aud).map((s) => String(s).toLowerCase());

        if (genreFilter.length && !genreFilter.some((g) => genres.includes(g.toLowerCase()))) return false;
        if (platformFilter.length && !platformFilter.some((p) => plats.includes(p.toLowerCase()))) return false;
        if (audienceFilter.length && !audienceFilter.some((a) => auds.includes(a.toLowerCase()))) return false;
        return true;
      });
    }

    // Sort
    const sorted = [...list];
    if (sortBy === 'oldest') {
      sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortBy === 'name') {
      sorted.sort((a, b) => {
        const an = (mode === 'people' ? a.users?.display_name : getContentName(a)) || '';
        const bn = (mode === 'people' ? b.users?.display_name : getContentName(b)) || '';
        return an.localeCompare(bn);
      });
    } else {
      sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, searchQuery, mode, peopleTab, contentTab, genreFilter, platformFilter, audienceFilter, hasAvatar, hasBio, sortBy]);

  const noun = mode === 'people' ? (peopleTab === 'creators' ? 'creators' : 'brands') : (contentTab === 'projects' ? 'projects' : 'campaigns');

  return (
    <div className="max-w-7xl mx-auto w-full px-5 sm:px-8 py-10 flex flex-col gap-7 relative pb-24">

      {/* Header */}
      <PageHeader
        eyebrow="Explore the network"
        title={`Search ${noun}`}
        subtitle={mode === 'people'
          ? `Discover and connect with ${noun} on CollabHub.`
          : `Browse ${noun} and find the right match to collaborate on.`}
      />

      {/* Mode + Sub-tabs */}
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          value={mode}
          onChange={(m) => { setMode(m); setShowFilters(false); }}
          options={[
            { key: 'people', label: 'People' },
            { key: 'content', label: 'Content' },
          ]}
        />
        <div className="bg-white/[0.03] p-1 rounded-xl border border-white/[0.06] flex text-sm">
          {(mode === 'people' ? [['creators', 'Creators'], ['brands', 'Brands']] : [['projects', 'Projects'], ['campaigns', 'Campaigns']]).map(([key, label]) => {
            const active = mode === 'people' ? peopleTab === key : contentTab === key;
            const onClick = () => (mode === 'people' ? setPeopleTab(key) : setContentTab(key));
            return (
              <button
                key={key}
                onClick={onClick}
                className={`px-5 py-2 rounded-lg font-semibold transition-all ${active ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search + filter toggle */}
      <div className="border-b border-white/[0.07] pb-7">
        <div className="flex gap-3 items-stretch">
          <div className="relative flex-1 max-w-xl">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-[18px] w-[18px] text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={mode === 'people' ? `Search ${noun} by name, role, or bio…` : `Search ${noun} by name or description…`}
              className="field pl-11"
            />
          </div>

          <button
            onClick={() => setShowFilters((s) => !s)}
            className={`px-5 rounded-xl text-sm font-semibold border transition-all flex items-center gap-2 shrink-0 ${showFilters || activeFilterCount > 0
              ? 'bg-primary-500/15 text-white border-primary-500/40'
              : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L14 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 018 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-primary-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{activeFilterCount}</span>
            )}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="mt-4 glass p-6 space-y-5 animate-scale-in">
            {mode === 'content' ? (
              <>
                <ChipFilter label="Genre" options={GENRE_OPTIONS} selected={genreFilter} onToggle={toggle(setGenreFilter)} />
                <ChipFilter label="Platforms" options={PLATFORM_OPTIONS} selected={platformFilter} onToggle={toggle(setPlatformFilter)} />
                <ChipFilter label="Target Audience" options={AUDIENCE_OPTIONS} selected={audienceFilter} onToggle={toggle(setAudienceFilter)} />
              </>
            ) : (
              <div className="text-left">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2.5">Show only</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setHasAvatar((v) => !v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${hasAvatar ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white border-primary-400/40' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'}`}
                  >
                    Has profile picture
                  </button>
                  <button
                    onClick={() => setHasBio((v) => !v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${hasBio ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white border-primary-400/40' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'}`}
                  >
                    Has bio
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-white/[0.05]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sort by</span>
                {[['newest', 'Newest'], ['oldest', 'Oldest'], ['name', 'Name A–Z']].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setSortBy(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${sortBy === key ? 'bg-white/10 text-white border border-white/10' : 'text-slate-400 hover:text-white'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button onClick={clearFilters} className="text-xs font-semibold text-slate-400 hover:text-white transition-colors">
                Clear all
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Result count */}
      {!loading && (
        <p className="text-sm text-slate-500 -mt-3 text-left">{filteredItems.length} {noun.slice(0, -1)}{filteredItems.length === 1 ? '' : 's'} found</p>
      )}

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass overflow-hidden">
              <div className="skeleton h-32 w-full" />
              <div className="p-6 space-y-3">
                <div className="skeleton h-5 w-1/2 rounded-lg" />
                <div className="skeleton h-3 w-2/3 rounded" />
                <div className="skeleton h-3 w-full rounded" />
                <div className="skeleton h-3 w-4/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title={searchQuery || activeFilterCount > 0 ? `No ${noun} match your search` : `No ${noun} found yet`}
          subtitle={searchQuery || activeFilterCount > 0 ? 'Try adjusting your search terms or clearing some filters.' : 'Check back soon as the network grows.'}
        />
      ) : mode === 'people' ? (
        <div className="stagger-children grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const user = item.users;
            if (!user) return null;
            return (
              <div
                key={item.id}
                className="hover-lift glass card-hover overflow-hidden cursor-pointer group flex flex-col"
                onClick={() => navigate(`/profile/${user.id}`)}
              >
                <div className="h-28 w-full bg-gradient-to-br from-primary-900/50 to-violet-900/40 border-b border-white/[0.07] relative shrink-0">
                  <div className="absolute inset-0 grid-bg opacity-60" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-900/90 to-transparent" />
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-l from-primary-500/15 to-transparent blur-2xl" />
                  <div className="absolute -bottom-8 left-6">
                    <Avatar
                      src={user.avatar}
                      name={user.display_name}
                      className="w-16 h-16 border-4 border-ink-900 shadow-card"
                      rounded="rounded-2xl"
                      textSize="text-xl"
                    />
                  </div>
                </div>
                <div className="p-6 pt-12 flex flex-col grow text-left">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="text-lg font-bold text-white truncate group-hover:text-primary-300 transition-colors">
                      {user.display_name || 'Unknown User'}
                    </h3>
                    <span className={`shrink-0 ml-2 capitalize ${peopleTab === 'creators' ? 'chip-emerald' : 'chip-amber'}`}>
                      {user.role || (peopleTab === 'creators' ? 'creator' : 'brand')}
                    </span>
                  </div>
                  {user.email && <p className="text-xs text-slate-500 mb-3 truncate">{user.email}</p>}
                  <p className="text-slate-400 text-sm line-clamp-3 mb-4 grow leading-relaxed">{user.bio || 'No bio provided.'}</p>
                  <div className="mt-auto pt-4 border-t border-white/[0.05] flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">
                      Joined {new Date(item.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-xs font-medium text-slate-500 group-hover:text-primary-300 transition-colors inline-flex items-center gap-1">
                      View Profile
                      <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="stagger-children grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const owner = getContentOwner(item);
            const name = getContentName(item);
            return (
              <div
                key={item.id}
                className="hover-lift glass card-hover overflow-hidden cursor-pointer group flex flex-col"
                onClick={() => navigate(`/${contentTab}/${item.id}`)}
              >
                <div className="h-44 w-full overflow-hidden bg-gradient-to-br from-primary-900/40 to-violet-900/30 border-b border-white/[0.07] shrink-0">
                  <SafeImage
                    src={item.image}
                    alt={name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                    fallback={
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-white/10 group-hover:text-primary-400/30 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    }
                  />
                </div>
                <div className="p-6 flex flex-col grow text-left">
                  {owner && (
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/[0.05]">
                      <Avatar src={owner.avatar} name={owner.display_name} className="w-9 h-9" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{owner.display_name || 'Unknown'}</p>
                        <p className="text-xs text-slate-500 truncate capitalize">{owner.role || 'Member'}</p>
                      </div>
                    </div>
                  )}
                  <h3 className="text-lg font-bold text-white mb-2.5 truncate group-hover:text-primary-300 transition-colors" title={name || 'Untitled'}>
                    {name || 'Untitled'}
                  </h3>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {safeJsonParse(item.target_aud).map((aud, idx) => aud && <span key={`aud-${idx}`} className="chip-emerald">{aud}</span>)}
                    {safeJsonParse(item.genre).map((g, idx) => g && <span key={`genre-${idx}`} className="chip-indigo">{g}</span>)}
                    {safeJsonParse(item.platforms).map((p, idx) => p && <span key={`plat-${idx}`} className="chip-violet">{p}</span>)}
                  </div>
                  <p className="text-slate-400 text-sm line-clamp-3 mb-5 grow leading-relaxed">{item.description || 'No description provided.'}</p>
                  <div className="mt-auto text-xs font-medium text-slate-500 flex items-center justify-between">
                    <span>{new Date(item.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    <span className="inline-flex items-center gap-1 group-hover:text-primary-300 transition-colors">
                      View Details
                      <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
