import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { Modal } from './ui';

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

      const res = await apiFetch('/api/collaborations', {
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Collaborate"
      subtitle={<>Send a request to <span className="text-white font-medium">{receiverName || 'this user'}</span></>}
      maxWidth="max-w-lg"
      headerExtra={
        <div className={`mt-3 ${projectName ? 'chip-indigo' : campaignName ? 'chip-violet' : 'chip-neutral'}`}>
          {projectName && '📁 '}
          {campaignName && '📄 '}
          {!projectName && !campaignName && '🤝 '}
          {contextLabel}
        </div>
      }
    >
      {success ? (
        <div className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-white font-semibold text-lg">Request Sent!</p>
          <p className="text-slate-400 text-sm mt-1">They'll see it in their inbox.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-7 space-y-5">
          {error && <div className="alert-error !p-3">{error}</div>}

          {/* Message */}
          <div>
            <label className="field-label">
              Message <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              rows="3"
              placeholder="Why do you want to collaborate? What value can you bring?"
              className="field resize-none"
              required
            />
          </div>

          {/* Budget */}
          <div>
            <label className="field-label">
              Budget <span className="text-slate-500">(optional)</span>
            </label>
            <input
              type="text"
              value={formData.budget}
              onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
              placeholder="e.g. $500 - $2,000"
              className="field"
            />
          </div>

          {/* Timeline */}
          <div>
            <label className="field-label">
              Timeline <span className="text-slate-500">(optional)</span>
            </label>
            <input
              type="text"
              value={formData.timeline}
              onChange={(e) => setFormData(prev => ({ ...prev, timeline: e.target.value }))}
              placeholder="e.g. 2 weeks, Q3 2026, ASAP"
              className="field"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-5 border-t border-white/10">
            <button type="button" onClick={onClose} className="btn-secondary btn-md flex-1">
              Cancel
            </button>
            <button type="submit" disabled={sending} className="btn-primary btn-md flex-1">
              {sending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
              {sending ? 'Sending…' : 'Send Request'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
