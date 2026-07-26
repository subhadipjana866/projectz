import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import CapsuleSelector from '../../components/CapsuleSelector';
import CollaborationModal from '../../components/CollaborationModal';
import SafeImage from '../../components/SafeImage';
import { Modal, Spinner } from '../../components/ui';

export default function CampaignDetails() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [modalError, setModalError] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [editFormData, setEditFormData] = useState({
    campaign_name: '',
    description: '',
    target_aud: [],
    genre: [],
    platforms: [],
    imageFile: null
  });
  const [showCollabModal, setShowCollabModal] = useState(false);

  useEffect(() => {
    fetchCampaignDetails();
  }, [campaignId]);

  const fetchCampaignDetails = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('campaigns').select('*, brands(user_id)').eq('id', campaignId).single();

    if (error) {
      console.error(error);
      setError("Could not load the campaign. It may have been deleted or doesn't exist.");
    } else if (data) {
      setCampaign(data);
      setIsOwner(data.brands?.user_id === user?.id);
      setEditFormData({
        campaign_name: data.campaign_name || '',
        description: data.description || '',
        target_aud: safeJsonParse(data.target_aud),
        genre: safeJsonParse(data.genre),
        platforms: safeJsonParse(data.platforms),
        imageFile: null
      });
      if (data.image) {
        setImagePreview(data.image);
      }
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCapsuleChange = (fieldName, value) => {
    setEditFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditFormData(prev => ({ ...prev, imageFile: file }));
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImageToS3 = async (file) => {
    try {
      const fileName = `${Date.now()}-${file.name}`;

      const signResponse = await apiFetch('/api/signUploadUrl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: fileName,
          fileType: file.type
        })
      });

      const { url } = await signResponse.json();

      const putResponse = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });

      // Strip the query string from the presigned PUT URL to get the object URL.
      return putResponse.url.split('?')[0];
    } catch (err) {
      console.error('Error uploading image:', err);
      throw new Error('Failed to upload image');
    }
  };

  const updateCampaign = async () => {
    setModalError('');
    if (!editFormData.campaign_name) {
      setModalError('Campaign name is required');
      return;
    }

    setIsSaving(true);
    try {
      let imageUrl = campaign.image;
      if (editFormData.imageFile) {
        imageUrl = await uploadImageToS3(editFormData.imageFile);
      }

      const { error } = await supabase
        .from('campaigns')
        .update({
          campaign_name: editFormData.campaign_name,
          description: editFormData.description,
          target_aud: editFormData.target_aud,
          genre: editFormData.genre,
          platforms: editFormData.platforms,
          image: imageUrl
        })
        .eq('id', campaignId);

      if (error) throw error;

      setCampaign(prev => ({
        ...prev,
        ...editFormData,
        image: imageUrl
      }));
      setIsEditMode(false);
    } catch (err) {
      console.error('Error updating campaign:', err);
      setModalError('Failed to update campaign. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

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

  if (loading) {
    return (
      <div className="flex-1 min-h-[60vh] flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="flex-1 min-h-[70vh] py-12 px-4 flex flex-col items-center justify-center">
        <div className="glass p-12 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Campaign not found</h2>
          <p className="text-slate-400 mb-8">{error}</p>
          <button onClick={() => navigate('/projects')} className="btn-primary btn-md w-full">
            ← Back to Campaigns
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 w-full">
      {/* Edit Modal */}
      <Modal isOpen={isEditMode} onClose={() => setIsEditMode(false)} title="Edit Campaign">
        <form onSubmit={(e) => { e.preventDefault(); updateCampaign(); }} className="p-7 space-y-6">
          {modalError && <div className="alert-error !p-3">{modalError}</div>}
          <div>
            <label className="field-label">Campaign Name <span className="text-rose-400">*</span></label>
            <input required type="text" name="campaign_name" value={editFormData.campaign_name} onChange={handleInputChange} className="field" placeholder="e.g. Campaign Alpha" />
          </div>

          <div>
            <label className="field-label">Description</label>
            <textarea rows="3" name="description" value={editFormData.description} onChange={handleInputChange} className="field resize-none" placeholder="What is this campaign about?"></textarea>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <CapsuleSelector
              label="Target Audience"
              placeholder="Add audience (e.g., Teenagers, Professionals)..."
              value={editFormData.target_aud}
              onChange={(value) => handleCapsuleChange('target_aud', value)}
              presetOptions={['Teenagers', 'Adults', 'Professionals', 'Kids', 'Students', 'Gaming Enthusiasts', 'Artists', 'Businesses']}
            />
            <CapsuleSelector
              label="Genre"
              placeholder="Add genre (e.g., RPG, Productivity)..."
              value={editFormData.genre}
              onChange={(value) => handleCapsuleChange('genre', value)}
              presetOptions={['Action', 'Adventure', 'RPG', 'Strategy', 'Simulation', 'Casual', 'Puzzle', 'Sports', 'Productivity', 'Education', 'Comedy', 'Drama']}
            />
          </div>

          <CapsuleSelector
            label="Platforms"
            placeholder="Add platform (e.g., iOS, Android, Web)..."
            value={editFormData.platforms}
            onChange={(value) => handleCapsuleChange('platforms', value)}
            presetOptions={['iOS', 'Android', 'Web', 'Windows', 'Mac', 'Linux', 'PlayStation', 'Xbox', 'Nintendo Switch']}
          />

          <div>
            <label className="field-label">Image <span className="text-slate-500">(optional)</span></label>
            <div className="flex items-end gap-4">
              {imagePreview && (
                <div className="w-24 h-24 rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
              <label className="flex-1 field cursor-pointer hover:bg-white/[0.07] text-center text-sm font-medium text-slate-300 hover:text-white">
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                {editFormData.imageFile ? 'Change Image' : 'Choose Image'}
              </label>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 flex justify-end gap-3 pb-1">
            <button type="button" onClick={() => setIsEditMode(false)} className="btn-secondary btn-md">Cancel</button>
            <button type="submit" disabled={isSaving} className="btn-violet btn-md">
              {isSaving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
              {isSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Hero Banner ─────────────────────────────────────── */}
      <div className="relative">
        <div className="relative overflow-hidden h-64 lg:h-80 border-b border-white/[0.07]">
          {campaign.image ? (
            <div className="absolute inset-0 z-0">
              <SafeImage src={campaign.image} alt={campaign.campaign_name} className="w-full h-full object-cover opacity-30" fallback={null} />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/80 to-transparent" />
            </div>
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-violet-900/40 via-ink-900 to-primary-900/30" />
              <div className="absolute inset-0 grid-bg" />
              <div className="absolute top-0 right-0 w-[32rem] h-[32rem] bg-gradient-to-l from-violet-500/15 to-transparent blur-3xl" />
            </>
          )}
        </div>

        <div className="max-w-6xl mx-auto px-5 sm:px-8 relative -mt-24 z-10 pb-8">
          <div className="flex flex-col md:flex-row gap-7 md:items-end text-left">
            <div className="gradient-ring rounded-3xl shrink-0 h-36 w-36 bg-ink-900 p-1.5 shadow-card animate-fade-up">
              <div className="w-full h-full rounded-[1.15rem] overflow-hidden bg-gradient-to-br from-violet-700/40 to-primary-700/40 flex items-center justify-center">
                <SafeImage
                  src={campaign.image}
                  alt={campaign.campaign_name}
                  className="w-full h-full object-cover"
                  fallback={
                    <svg className="w-12 h-12 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.3} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                  }
                />
              </div>
            </div>
            <div className="flex-1 pb-1 animate-fade-up" style={{ animationDelay: '.08s' }}>
              <div className="flex items-center gap-2.5 mb-4 flex-wrap">
                <button onClick={() => navigate('/projects')} className="btn-secondary btn-sm">
                  ← Back to Directory
                </button>
                {isOwner && (
                  <button onClick={() => { setModalError(''); setIsEditMode(true); }} className="btn-violet btn-sm">
                    Edit
                  </button>
                )}
                {!isOwner && user && (
                  <button onClick={() => setShowCollabModal(true)} className="btn-violet btn-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Collaborate
                  </button>
                )}
              </div>
              <p className="eyebrow mb-1.5 !text-violet-400">Brand campaign</p>
              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                {campaign.campaign_name || 'Untitled Campaign'}
              </h1>
              <p className="text-slate-500 text-sm font-medium mt-3">
                Created on {new Date(campaign.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-5 sm:px-8 mt-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 text-left">
          {/* Main Description */}
          <div className="lg:col-span-2 space-y-7">
            <div className="glass p-7 sm:p-8">
              <p className="eyebrow mb-1.5 !text-violet-400">Overview</p>
              <h2 className="text-2xl font-bold mb-6 text-white">About This Campaign</h2>
              <div className="text-slate-300 leading-relaxed text-lg whitespace-pre-wrap">
                {campaign.description || <span className="italic text-slate-500">No detailed description has been provided for this campaign.</span>}
              </div>
            </div>
          </div>

          {/* Side Panel Details */}
          <div className="space-y-7">
            <div className="glass p-7">
              <p className="eyebrow mb-1.5 !text-violet-400">At a glance</p>
              <h3 className="text-lg font-bold mb-6 text-white">Campaign Metrics</h3>

              <div className="space-y-6">
                {/* Target Audience */}
                <div className="border-b border-white/[0.05] pb-5">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Target Audience</p>
                  <div className="flex flex-wrap gap-2">
                    {safeJsonParse(campaign.target_aud).map((aud, idx) =>
                      aud && <span key={`aud-${idx}`} className="chip-emerald">{aud}</span>
                    )}
                    {!safeJsonParse(campaign.target_aud).length && <span className="text-slate-500 italic text-sm">Not specified</span>}
                  </div>
                </div>

                {/* Genre */}
                <div className="border-b border-white/[0.05] pb-5">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Genre</p>
                  <div className="flex flex-wrap gap-2">
                    {safeJsonParse(campaign.genre).map((g, idx) =>
                      g && <span key={`genre-${idx}`} className="chip-indigo">{g}</span>
                    )}
                    {!safeJsonParse(campaign.genre).length && <span className="text-slate-500 italic text-sm">Not specified</span>}
                  </div>
                </div>

                {/* Platforms */}
                <div className="border-b border-white/[0.05] pb-5">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Platforms</p>
                  <div className="flex flex-wrap gap-2">
                    {safeJsonParse(campaign.platforms).map((p, idx) =>
                      p && <span key={`plat-${idx}`} className="chip-violet">{p}</span>
                    )}
                    {!safeJsonParse(campaign.platforms).length && <span className="text-slate-500 italic text-sm">Not specified</span>}
                  </div>
                </div>

                {/* Reference ID */}
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2.5">Reference ID</p>
                  <p className="text-xs font-mono text-slate-400 bg-black/40 px-3 py-2 rounded-lg border border-white/[0.06] inline-block break-all">
                    {campaign.id}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Collaboration Modal */}
      <CollaborationModal
        isOpen={showCollabModal}
        onClose={() => setShowCollabModal(false)}
        receiverId={campaign?.brands?.user_id}
        receiverName={null}
        campaignId={campaign?.id}
        campaignName={campaign?.campaign_name}
      />
    </div>
  );
}
