import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function CollaborationModal({ isOpen, onClose, receiverId, receiverName, projectId, projectName, campaignId, campaignName }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    message: '',
    budget: '',
    timeline: '',
  });
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const contextLabel = projectName
    ? `Project: ${projectName}`
    : campaignName
      ? `Campaign: ${campaignName}`
      : 'General Collaboration';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.message.trim()) {
      setError('Please enter a message');
      return;
    }

    setSending(true);
    setError('');

    try {
      const payload = {
        senderId: user.id,
        receiverId,
        message: formData.message,
        budget: formData.budget || null,
        timeline: formData.timeline || null,
      };
      if (projectId) payload.projectId = projectId;
      if (campaignId) payload.campaignId = campaignId;

      const res = await fetch('/api/collaborations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send request');
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setFormData({ message: '', budget: '', timeline: '' });
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#101622] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/10 bg-[rgba(255,255,255,0.02)]">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-white">Collaborate</h2>
              <p className="text-sm text-slate-400 mt-1">
                Send a request to <span className="text-white font-medium">{receiverName || 'this user'}</span>
              </p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              ✕
            </button>
          </div>
          {/* Context badge */}
          <div className="mt-3 inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            {projectName && '📁 '}
            {campaignName && '📄 '}
            {!projectName && !campaignName && '🤝 '}
            {contextLabel}
          </div>
        </div>

        {/* Body */}
        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-white font-semibold text-lg">Request Sent!</p>
            <p className="text-slate-400 text-sm mt-1">They'll see it in their inbox.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Message */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2 text-left">
                Message <span className="text-red-400">*</span>
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                rows="3"
                placeholder="Why do you want to collaborate? What value can you bring?"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                required
              />
            </div>

            {/* Budget */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2 text-left">
                Budget <span className="text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                value={formData.budget}
                onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                placeholder="e.g. $500 - $2,000"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Timeline */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2 text-left">
                Timeline <span className="text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                value={formData.timeline}
                onChange={(e) => setFormData(prev => ({ ...prev, timeline: e.target.value }))}
                placeholder="e.g. 2 weeks, Q3 2026, ASAP"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white font-medium hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending}
                className="flex-1 px-4 py-2.5 bg-[#1152d4] hover:bg-blue-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
              >
                {sending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
                {sending ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
