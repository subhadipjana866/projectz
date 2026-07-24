import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Inbox() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('received');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    if (user) fetchRequests();
  }, [user, activeTab]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'received'
        ? `/api/collaborations/inbox?userId=${user.id}`
        : `/api/collaborations/sent?userId=${user.id}`;

      const res = await fetch(endpoint);
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching requests:', err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/collaborations/${id}/accept?userId=${user.id}`, { method: 'PATCH' });
      if (res.ok) {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'accepted' } : r));
      }
    } catch (err) {
      console.error('Error accepting:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/collaborations/${id}/reject?userId=${user.id}`, { method: 'PATCH' });
      if (res.ok) {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
      }
    } catch (err) {
      console.error('Error rejecting:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      accepted: 'bg-green-500/20 text-green-300 border-green-500/30',
      rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${styles[status] || styles.pending}`}>
        {status === 'pending' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 animate-pulse"></span>}
        {status === 'accepted' && <span className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5"></span>}
        {status === 'rejected' && <span className="w-1.5 h-1.5 rounded-full bg-red-400 mr-1.5"></span>}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getContextLabel = (item) => {
    if (item.project) return { label: item.project.project_name, type: 'Project', color: 'text-blue-300 bg-blue-500/10 border-blue-500/20' };
    if (item.campaign) return { label: item.campaign.campaign_name, type: 'Campaign', color: 'text-purple-300 bg-purple-500/10 border-purple-500/20' };
    return { label: 'General', type: 'Profile', color: 'text-slate-300 bg-white/5 border-white/10' };
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="max-w-5xl mx-auto px-8 py-8 pb-24">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white tracking-tight text-left">Inbox</h1>
        <p className="mt-2 text-lg text-slate-400 text-left">Manage your collaboration requests.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-[rgba(255,255,255,0.05)] backdrop-blur-md p-1.5 rounded-xl border border-white/10 flex">
          <button
            onClick={() => setActiveTab('received')}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'received'
              ? 'bg-[#1152d4] text-white shadow-lg shadow-blue-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
          >
            Received
            {activeTab === 'received' && pendingCount > 0 && (
              <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pendingCount}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'sent'
              ? 'bg-[#1152d4] text-white shadow-lg shadow-blue-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
          >
            Sent
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded-2xl p-16 text-center backdrop-blur-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-slate-400 text-lg font-medium">No {activeTab} requests yet</p>
          <p className="text-slate-500 text-sm mt-1">
            {activeTab === 'received' ? 'When someone sends you a collaboration request, it will appear here.' : 'Requests you send will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(item => {
            const person = activeTab === 'received' ? item.sender : item.receiver;
            const context = getContextLabel(item);

            return (
              <div key={item.id} className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded-2xl p-6 backdrop-blur-sm hover:bg-[rgba(255,255,255,0.05)] transition-all">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div
                    className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shrink-0 cursor-pointer border border-white/10"
                    onClick={() => person && navigate(`/profile/${person.id}`)}
                  >
                    {person?.avatar ? (
                      <img src={person.avatar} alt={person.display_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-lg font-bold">{person?.display_name?.[0]?.toUpperCase() || '?'}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <p
                        className="font-semibold text-white cursor-pointer hover:text-blue-400 transition-colors"
                        onClick={() => person && navigate(`/profile/${person.id}`)}
                      >
                        {person?.display_name || 'Unknown User'}
                      </p>
                      <span className="text-xs text-slate-500 uppercase font-bold">{person?.role}</span>
                      {getStatusBadge(item.status)}
                    </div>

                    {/* Context */}
                    <div className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border mb-3 ${context.color}`}>
                      {context.type}: {context.label}
                    </div>

                    {/* Message */}
                    <p className="text-slate-300 text-sm leading-relaxed text-left">{item.message}</p>

                    {/* Budget & Timeline */}
                    {(item.budget || item.timeline) && (
                      <div className="flex gap-4 mt-3">
                        {item.budget && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <span className="text-green-400">💰</span>
                            <span className="font-medium">{item.budget}</span>
                          </div>
                        )}
                        {item.timeline && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <span className="text-blue-400">📅</span>
                            <span className="font-medium">{item.timeline}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Timestamp */}
                    <p className="text-xs text-slate-500 mt-3">
                      {new Date(item.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 shrink-0">
                    {activeTab === 'received' && item.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleAccept(item.id)}
                          disabled={actionLoading === item.id}
                          className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50 shadow-lg shadow-green-500/10"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleReject(item.id)}
                          disabled={actionLoading === item.id}
                          className="px-4 py-2 bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-slate-300 hover:text-red-300 text-sm font-semibold rounded-lg transition-all disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {item.status === 'accepted' && (
                      <button
                        onClick={() => navigate(`/chat/${item.id}`)}
                        className="px-4 py-2 bg-[#1152d4] hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all shadow-lg shadow-blue-500/10 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Chat
                      </button>
                    )}
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
