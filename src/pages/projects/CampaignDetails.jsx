import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import CapsuleSelector from '../../components/CapsuleSelector';

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
  const [imagePreview, setImagePreview] = useState(null);
  const [editFormData, setEditFormData] = useState({
    campaign_name: '',
    description: '',
    target_aud: [],
    genre: [],
    platforms: [],
    imageFile: null
  });

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
      
      const signResponse = await fetch('/api/signUploadUrl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: fileName,
          fileType: file.type,
          userFirstName: user.id
        })
      });

      const { url, key } = await signResponse.json();

      await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });

      return `https://${import.meta.env.VITE_S3_BUCKET_NAME}.s3.${import.meta.env.VITE_S3_REGION}.amazonaws.com/${key}`;
    } catch (err) {
      console.error('Error uploading image:', err);
      throw new Error('Failed to upload image');
    }
  };

  const updateCampaign = async () => {
    if (!editFormData.campaign_name) {
      alert('Campaign name is required');
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
      alert('Campaign updated successfully!');
    } catch (err) {
      console.error('Error updating campaign:', err);
      setError('Failed to update campaign');
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
      <div className="min-h-screen bg-[#101622] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-[#101622] py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-white font-sans">
        <div className="bg-[rgba(255,255,255,0.03)] p-12 rounded-3xl shadow-2xl border border-[rgba(255,255,255,0.05)] max-w-md w-full text-center backdrop-blur-sm">
          <div className="text-5xl mb-6 opacity-80">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-3">Campaign not found</h2>
          <p className="text-slate-400 mb-8">{error}</p>
          <button 
            onClick={() => navigate('/projects')}
            className="w-full inline-flex justify-center flex-row items-center px-6 py-3 border border-transparent shadow-lg shadow-blue-500/20 text-sm font-semibold rounded-lg text-white bg-[#1152d4] hover:bg-blue-700 transition-all"
          >
            ← Back to Campaigns
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Edit Modal */}
      {isEditMode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#101622] rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] w-full max-w-2xl overflow-hidden border border-white/10">
            <div className="px-8 py-6 border-b border-white/10 flex justify-between items-center bg-[rgba(255,255,255,0.02)]">
              <h2 className="text-2xl font-bold text-white">Edit Campaign</h2>
              <button onClick={() => setIsEditMode(false)} className="text-slate-400 hover:text-white outline-none p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                ✕
              </button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); updateCampaign(); }} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Campaign Name <span className="text-red-400">*</span></label>
                <input required type="text" name="campaign_name" value={editFormData.campaign_name} onChange={handleInputChange} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all text-white placeholder-slate-500" placeholder="e.g. Campaign Alpha"/>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Description</label>
                <textarea rows="3" name="description" value={editFormData.description} onChange={handleInputChange} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all resize-none text-white placeholder-slate-500" placeholder="What is this campaign about?"></textarea>
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
                <label className="block text-sm font-semibold text-slate-200 mb-2">Image <span className="text-slate-400">(optional)</span></label>
                <div className="flex items-end gap-4">
                  {imagePreview && (
                    <div className="w-24 h-24 rounded-lg overflow-hidden border border-white/10 flex-shrink-0">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <label className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-all text-center text-sm font-medium text-slate-300 hover:text-white">
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    {editFormData.imageFile ? 'Change Image' : 'Choose Image'}
                  </label>
                </div>
              </div>
              
              <div className="pt-6 mt-8 border-t border-white/10 flex justify-end gap-4 pb-2">
                <button type="button" onClick={() => setIsEditMode(false)} className="px-6 py-2.5 text-sm font-semibold text-slate-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-all">Cancel</button>
                <button type="submit" disabled={isSaving} className="px-6 py-2.5 text-sm font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
                  {isSaving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hero Banner Section */}
      <div className="relative group">
        <div className="backdrop-blur-sm bg-[rgba(255,255,255,0.03)] border-b border-[rgba(255,255,255,0.05)] overflow-hidden h-72 lg:h-96">
          {campaign.image ? (
            <div className="absolute inset-0 z-0">
               <img src={campaign.image} alt={campaign.campaign_name} className="w-full h-full object-cover opacity-30 mix-blend-screen" />
               <div className="absolute inset-0 bg-gradient-to-t from-[#101622] via-[#101622]/80 to-transparent"></div>
            </div>
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-blue-500/5 to-[#101622] opacity-60"></div>
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-l from-blue-500/20 to-transparent blur-3xl"></div>
            </>
          )}
        </div>

        <div className="max-w-7xl mx-auto px-8 relative -mt-32 z-10 pb-8">
          <div className="flex flex-col md:flex-row gap-8 items-end">
            <div className="border-4 border-[#101622] bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl overflow-hidden shadow-2xl shrink-0 h-40 w-40 flex items-center justify-center text-6xl text-slate-600">
               {campaign.image ? (
                  <img src={campaign.image} alt={campaign.campaign_name} className="w-full h-full object-cover" />
               ) : (
                  <span>📄</span>
               )}
            </div>
            <div className="flex-1 pb-2">
              <div className="mb-2">
                <div className="flex items-center gap-2 mb-4">
                  <button 
                    onClick={() => navigate('/projects')}
                    className="text-sm font-medium text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-1.5 rounded-lg transition-all border border-white/10 inline-block"
                  >
                    ← Back to Directory
                  </button>
                  {isOwner && (
                    <button
                      onClick={() => setIsEditMode(true)}
                      className="text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 px-4 py-1.5 rounded-lg transition-all"
                    >
                      Edit
                    </button>
                  )}
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                  {campaign.campaign_name || 'Untitled Campaign'}
                </h1>
              </div>
              <p className="text-slate-400 text-sm font-medium">
                Created on {new Date(campaign.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 mt-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Description */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded-2xl p-8 backdrop-blur-sm">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" />
                </svg>
                About This Campaign
              </h2>
              <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed text-lg whitespace-pre-wrap">
                {campaign.description || <span className="italic text-slate-500">No detailed description has been provided for this campaign.</span>}
              </div>
            </div>
          </div>

          {/* Side Panel Details */}
          <div className="space-y-8">
            <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded-2xl p-8 backdrop-blur-sm">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-13c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z" />
                </svg>
                Campaign Metrics
              </h3>
              
              <div className="space-y-6">
                {/* Target Audience */}
                <div className="border-b border-white/5 pb-4">
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Target Audience</p>
                  <div className="flex flex-wrap gap-2">
                    {safeJsonParse(campaign.target_aud).map((aud, idx) => 
                      aud && <span key={`aud-${idx}`} className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-500/20 text-green-300 border border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.1)]">{aud}</span>
                    )}
                    {!safeJsonParse(campaign.target_aud).length && <span className="text-slate-500 italic text-sm">Not specified</span>}
                  </div>
                </div>

                {/* Genre */}
                <div className="border-b border-white/5 pb-4">
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Genre</p>
                  <div className="flex flex-wrap gap-2">
                    {safeJsonParse(campaign.genre).map((g, idx) => 
                      g && <span key={`genre-${idx}`} className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.1)]">{g}</span>
                    )}
                    {!safeJsonParse(campaign.genre).length && <span className="text-slate-500 italic text-sm">Not specified</span>}
                  </div>
                </div>

                {/* Platforms */}
                <div className="border-b border-white/5 pb-4">
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Platforms</p>
                  <div className="flex flex-wrap gap-2">
                    {safeJsonParse(campaign.platforms).map((p, idx) => 
                      p && <span key={`plat-${idx}`} className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.1)]">{p}</span>
                    )}
                    {!safeJsonParse(campaign.platforms).length && <span className="text-slate-500 italic text-sm">Not specified</span>}
                  </div>
                </div>

                {/* Reference ID */}
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Reference ID</p>
                  <p className="text-xs font-mono text-slate-400 bg-black/40 px-3 py-2 rounded-lg border border-white/5 inline-block break-all">
                    {campaign.id}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
