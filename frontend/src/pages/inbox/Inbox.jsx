import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { PageHeader, Segmented, Avatar, EmptyState, PageLoader } from '../../components/ui';

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
        ? `/api/collaborations/inbox`
        : `/api/collaborations/sent`;

      const res = await apiFetch(endpoint);
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
      const res = await apiFetch(`/api/collaborations/${id}/accept`, { method: 'PATCH' });
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
      const res = await apiFetch(`/api/collaborations/${id}/reject`, { method: 'PATCH' });
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
      pending: 'chip-amber',
      accepted: 'chip-emerald',
      rejected: 'chip-rose',
    };
    const dots = {
      pending: 'bg-amber-400 animate-pulse',
      accepted: 'bg-emerald-400',
      rejected: 'bg-rose-400',
    };
    return (
      <span className={styles[status] || styles.pending}>
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dots[status] || dots.pending}`} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getContextLabel = (item) => {
    if (item.project) return { label: item.project.project_name, type: 'Project', chip: 'chip-indigo' };
    if (item.campaign) return { label: item.campaign.campaign_name, type: 'Campaign', chip: 'chip-violet' };
    return { label: 'General', type: 'Profile', chip: 'chip-neutral' };
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="max-w-5xl mx-auto w-full px-5 sm:px-8 py-10 pb-24">
      {/* Header */}
      <PageHeader
        eyebrow="Collaboration requests"
        title="Inbox"
        subtitle="Review, accept and manage your collaboration requests."
        className="mb-8"
      />

      {/* Tabs */}
      <div className="mb-8">
        <Segmented
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { key: 'received', label: 'Received', badge: activeTab === 'received' ? pendingCount : 0 },
            { key: 'sent', label: 'Sent' },
          ]}
        />
      </div>

      {/* Content */}
      {loading ? (
        <PageLoader />
      ) : requests.length === 0 ? (
        <EmptyState
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
          title={`No ${activeTab} requests yet`}
          subtitle={activeTab === 'received'
            ? 'When someone sends you a collaboration request, it will appear here.'
            : 'Requests you send will appear here.'}
        />
      ) : (
        <div className="stagger-children space-y-4">
          {requests.map(item => {
            const person = activeTab === 'received' ? item.sender : item.receiver;
            const context = getContextLabel(item);

            return (
              <div key={item.id} className="glass card-hover p-6">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <Avatar
                    src={person?.avatar}
                    name={person?.display_name}
                    className="w-12 h-12"
                    rounded="rounded-xl"
                    textSize="text-lg"
                    onClick={() => person && navigate(`/profile/${person.id}`)}
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                      <p
                        className="font-semibold text-white cursor-pointer hover:text-primary-300 transition-colors"
                        onClick={() => person && navigate(`/profile/${person.id}`)}
                      >
                        {person?.display_name || 'Unknown User'}
                      </p>
                      <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">{person?.role}</span>
                      {getStatusBadge(item.status)}
                    </div>

                    {/* Context */}
                    <div className={`${context.chip} mb-3`}>
                      {context.type}: {context.label}
                    </div>

                    {/* Message */}
                    <p className="text-slate-300 text-sm leading-relaxed">{item.message}</p>

                    {/* Budget & Timeline */}
                    {(item.budget || item.timeline) && (
                      <div className="flex flex-wrap gap-3 mt-3.5">
                        {item.budget && (
                          <div className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-white/[0.04] border border-white/[0.07] rounded-lg px-2.5 py-1.5">
                            <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span className="font-medium">{item.budget}</span>
                          </div>
                        )}
                        {item.timeline && (
                          <div className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-white/[0.04] border border-white/[0.07] rounded-lg px-2.5 py-1.5">
                            <svg className="w-3.5 h-3.5 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            <span className="font-medium">{item.timeline}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Timestamp */}
                    <p className="text-xs text-slate-500 mt-3.5">
                      {new Date(item.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                    {activeTab === 'received' && item.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleAccept(item.id)}
                          disabled={actionLoading === item.id}
                          className="btn btn-sm text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/15 rounded-lg px-4 py-2"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleReject(item.id)}
                          disabled={actionLoading === item.id}
                          className="btn btn-sm text-slate-300 bg-white/5 border border-white/10 hover:bg-rose-500/15 hover:border-rose-500/30 hover:text-rose-300 rounded-lg px-4 py-2"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {item.status === 'accepted' && (
                      <button
                        onClick={() => navigate(`/chat/${item.id}`)}
                        className="btn-primary btn-sm rounded-lg px-4 py-2"
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
