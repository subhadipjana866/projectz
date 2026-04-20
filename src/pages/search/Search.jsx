import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function Search() {
  const [activeTab, setActiveTab] = useState('creators');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    const table = activeTab === 'creators' ? 'creators' : 'brands';

    const { data, error } = await supabase
      .from(table)
      .select('*, users(id, display_name, role, avatar, bio, email)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setItems(data);
    } else {
      console.error('Error fetching:', error);
      setItems([]);
    }
    setLoading(false);
  };

  const getUser = (item) => item.users || null;

  const filteredItems = items.filter(item => {
    const user = getUser(item);
    if (!user) return false;
    const query = searchQuery.toLowerCase();
    return (
      user.display_name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.bio?.toLowerCase().includes(query) ||
      user.role?.toLowerCase().includes(query)
    );
  });

  const tabLabel = activeTab === 'creators' ? 'Creators' : 'Brands';

  return (
    <>
      <div className="max-w-7xl mx-auto px-8 py-8 flex flex-col gap-8 relative pb-24">

        {/* Toggle Tabs */}
        <div className="flex justify-center mb-4">
          <div className="bg-[rgba(255,255,255,0.05)] backdrop-blur-md p-1.5 rounded-xl border border-white/10 flex">
            <button
              onClick={() => setActiveTab('creators')}
              className={`px-8 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'creators' ? 'bg-[#1152d4] text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              Creators
            </button>
            <button
              onClick={() => setActiveTab('brands')}
              className={`px-8 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'brands' ? 'bg-[#1152d4] text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              Brands
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="border-b border-white/10 pb-8 mt-4">
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-white tracking-tight text-left">Search {tabLabel}</h1>
            <p className="mt-2 text-lg text-slate-400 text-left">Discover and connect with {tabLabel.toLowerCase()} on CollabHub.</p>
          </div>
          <div className="relative max-w-xl">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${tabLabel.toLowerCase()} by name, role, or bio...`}
              className="w-full pl-11 pr-4 py-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded-xl text-base text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all backdrop-blur-sm shadow-inner shadow-black/20"
            />
          </div>
        </div>

        {/* Results Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded-2xl p-12 text-center text-slate-400 backdrop-blur-sm">
            {searchQuery ? `No ${tabLabel.toLowerCase()} found matching "${searchQuery}".` : `No ${tabLabel.toLowerCase()} found yet.`}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredItems.map(item => {
              const user = getUser(item);
              if (!user) return null;

              return (
                <div
                  key={item.id}
                  className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded-2xl overflow-hidden hover:bg-[rgba(255,255,255,0.05)] transition-all cursor-pointer group flex flex-col backdrop-blur-sm hover:shadow-2xl shadow-black/50"
                  onClick={() => navigate(`/profile/${user.id}`)}
                >
                  {/* Banner */}
                  <div className="h-32 w-full bg-gradient-to-br from-blue-900/40 to-purple-900/40 border-b border-white/10 relative shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-t from-[rgba(16,22,34,0.9)] to-transparent"></div>
                    <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-l from-blue-500/15 to-transparent blur-2xl"></div>
                    {/* Avatar overlapping */}
                    <div className="absolute -bottom-8 left-6">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center border-4 border-[#101622] shadow-xl">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.display_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white text-xl font-bold">{user.display_name?.[0]?.toUpperCase() || '?'}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 pt-12 flex flex-col grow">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="text-lg font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                        {user.display_name || 'Unknown User'}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold shrink-0 ml-2 ${activeTab === 'creators'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                        {user.role || tabLabel.slice(0, -1)}
                      </span>
                    </div>

                    {user.email && (
                      <p className="text-xs text-slate-500 mb-3 truncate text-left">{user.email}</p>
                    )}

                    <p className="text-slate-400 text-sm line-clamp-3 mb-4 grow text-left">
                      {user.bio || 'No bio provided.'}
                    </p>

                    <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">
                        Joined {new Date(item.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-xs font-medium text-slate-500 group-hover:text-blue-400 transition-colors">
                        View Profile →
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
