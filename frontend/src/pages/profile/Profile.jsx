import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { apiFetch } from '../../lib/api';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import CollaborationModal from '../../components/CollaborationModal';
import SafeImage from '../../components/SafeImage';
import { Modal, Avatar } from '../../components/ui';

// Backend API calls go through vite proxy, no need for full URL

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { userId } = useParams();

  const [youtubeStatus, setYoutubeStatus] = useState({ connected: false, channel_title: '' });
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [youtubeAnalytics, setYoutubeAnalytics] = useState(null);
  const [portfolioTab, setPortfolioTab] = useState('YouTube');

  // Profile data state
  const [profileData, setProfileData] = useState(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({
    display_name: '',
    bio: '',
    avatar: null,
  });
  const [profilePicPreview, setProfilePicPreview] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Projects and Campaigns state
  const [userProjects, setUserProjects] = useState([]);
  const [userCampaigns, setUserCampaigns] = useState([]);
  const [loadingCreations, setLoadingCreations] = useState(false);

  // Real accepted-collaboration partners for this profile
  const [partners, setPartners] = useState([]);

  // Collaboration modal state
  const [showCollabModal, setShowCollabModal] = useState(false);

  // Custom confirm modal state
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null });

  const showConfirm = (title, message, onConfirm) => {
    setConfirmModal({ open: true, title, message, onConfirm });
  };

  const handleConfirm = () => {
    confirmModal.onConfirm?.();
    setConfirmModal({ open: false, title: '', message: '', onConfirm: null });
  };

  const handleCancelConfirm = () => {
    setConfirmModal({ open: false, title: '', message: '', onConfirm: null });
  };

  // Check URL params for oauth callback status
  useEffect(() => {
    if (!user) return;

    const currentUserId = userId || user?.id;
    setIsOwnProfile(currentUserId === user?.id);

    // Initialize creator profile - only if own profile
    const initializeProfile = async () => {
      if (currentUserId !== user?.id) return;

      try {
        const token = await getAuthToken();
        if (!token) return;

        await axios.post('/api/profile/me/initialize', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.error('Error initializing profile:', err);
      }
    };

    const urlParams = new URLSearchParams(window.location.search);
    const cbStatus = urlParams.get('youtube');
    if (cbStatus === 'connected') {
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchYoutubeStatus(currentUserId);
    } else if (cbStatus === 'error') {
      setApiError("Failed to connect YouTube account.");
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchYoutubeStatus(currentUserId);
    } else {
      fetchYoutubeStatus(currentUserId);
    }

    // Fetch profile data from database
    fetchUserProfile(currentUserId);

    // Fetch user's created projects and campaigns
    fetchUserCreations(currentUserId);

    // Fetch real accepted-collaboration partners
    fetchPartners(currentUserId);

    if (currentUserId === user?.id) {
      initializeProfile();
    }
  }, [user, userId]);

  const fetchUserCreations = async (targetId) => {
    try {
      setLoadingCreations(true);
      // Clear previous profile's data immediately to prevent stale data showing
      setUserProjects([]);
      setUserCampaigns([]);

      // Fetch projects created by this creator
      let creatorId = null;
      if (targetId) {
        const { data: creatorData } = await supabase
          .from('creators')
          .select('id')
          .eq('user_id', targetId)
          .single();
        creatorId = creatorData?.id;
      }

      if (creatorId) {
        const { data: projectsData } = await supabase
          .from('projects')
          .select('*')
          .eq('creator_id', creatorId)
          .order('created_at', { ascending: false });
        setUserProjects(projectsData || []);
      }

      // Fetch campaigns created by this brand
      let brandId = null;
      if (targetId) {
        const { data: brandData } = await supabase
          .from('brands')
          .select('id')
          .eq('user_id', targetId)
          .single();
        brandId = brandData?.id;
      }

      if (brandId) {
        const { data: campaignsData } = await supabase
          .from('campaigns')
          .select('*')
          .eq('brand_id', brandId)
          .order('created_at', { ascending: false });
        setUserCampaigns(campaignsData || []);
      }

      setLoadingCreations(false);
    } catch (err) {
      console.error('Error fetching user creations:', err);
      setLoadingCreations(false);
    }
  };

  const fetchPartners = async (targetId) => {
    try {
      setPartners([]);
      if (!targetId) return;
      const res = await fetch(`/api/collaborations/partners?userId=${targetId}`);
      const data = await res.json();
      setPartners(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching partners:', err);
      setPartners([]);
    }
  };

  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || localStorage.getItem('auth_token');
  };

  const fetchUserProfile = async (targetId) => {
    try {
      const idToFetch = targetId || userId || user?.id;
      if (!idToFetch) return;

      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', idToFetch)
        .single();

      if (error) throw error;

      setProfileData(data);
      setIsOwnProfile(idToFetch === user?.id);

      // Initialize edit form with user data
      setEditFormData({
        display_name: data.display_name || '',
        bio: data.bio || '',
        avatar: null,
      });

      if (data.avatar) {
        setProfilePicPreview(data.avatar);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setApiError('Failed to load profile');
      setLoading(false);
    }
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditFormData(prev => ({
        ...prev,
        avatar: file
      }));

      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      setApiError(null);

      // Validate required fields
      if (!editFormData.display_name) {
        setApiError('Display name is required');
        setIsSaving(false);
        return;
      }

      let avatar_url = profileData?.avatar;

      // Upload profile pic if changed to s3 on AWS
      if (editFormData.avatar) {
        const response = await apiFetch(`/api/signUploadUrl`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ fileName: editFormData.avatar.name, fileType: editFormData.avatar.type })
        });

        // use the signed url to upload the file to s3
        const { url } = await response.json();
        const response2 = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': editFormData.avatar.type },
          body: editFormData.avatar
        });
        avatar_url = response2.url.split('?')[0]; // Get the URL without query params
      }

      // Update existing user profile
      const { error: updateError } = await supabase
        .from('users')
        .update({
          display_name: editFormData.display_name,
          bio: editFormData.bio,
          avatar: avatar_url,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Refresh profile data
      await fetchUserProfile(user.id);
      setIsEditMode(false);
    } catch (err) {
      console.error('Error saving profile:', err);
      setApiError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditMode(false);
    // Reset form to current profile data
    setEditFormData({
      display_name: profileData?.display_name || '',
      bio: profileData?.bio || '',
      avatar: null,
    });
    if (profileData?.avatar) {
      setProfilePicPreview(profileData.avatar);
    }
  };

  const fetchYoutubeStatus = async (targetUserId) => {
    try {
      const uid = targetUserId || userId || user?.id;
      const response = await axios.get(`/api/youtube/status?userId=${uid}`);
      setYoutubeStatus(response.data);

      if (response.data.connected) {
        fetchYoutubeAnalytics(uid);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchYoutubeAnalytics = async (targetUserId) => {
    try {
      const uid = targetUserId || userId || user?.id;
      const resp = await axios.get(`/api/youtube/analytics?userId=${uid}`);
      setYoutubeAnalytics(resp.data);
    } catch (err) {
      console.error('Could not fetch analytics', err);
    }
  };

  const connectYoutube = async () => {
    try {
      setRedirecting(true);
      const response = await axios.get(`/api/youtube/auth-url?userId=${user?.id}`);
      window.location.href = response.data.auth_url;
    } catch (err) {
      console.error(err);
      setApiError('Could not initiate YouTube connection.');
      setRedirecting(false);
    }
  };

  const disconnectYoutube = () => {
    showConfirm('Disconnect YouTube', 'Are you sure you want to disconnect your YouTube account?', async () => {
      try {
        await axios.delete(`/api/youtube/disconnect?userId=${user?.id}`);
        setYoutubeStatus({ connected: false });
        setYoutubeAnalytics(null);
      } catch (err) {
        console.error(err);
        setApiError('Failed to disconnect.');
      }
    });
  };

  const deleteProject = (projectId) => {
    showConfirm('Delete Project', 'Are you sure you want to delete this project? This action cannot be undone.', async () => {
      try {
        await supabase.from('projects').delete().eq('id', projectId);
        setUserProjects(userProjects.filter(p => p.id !== projectId));
      } catch (err) {
        console.error('Error deleting project:', err);
        setApiError('Failed to delete project');
      }
    });
  };

  const deleteCampaign = (campaignId) => {
    showConfirm('Delete Campaign', 'Are you sure you want to delete this campaign? This action cannot be undone.', async () => {
      try {
        await supabase.from('campaigns').delete().eq('id', campaignId);
        setUserCampaigns(userCampaigns.filter(c => c.id !== campaignId));
      } catch (err) {
        console.error('Error deleting campaign:', err);
        setApiError('Failed to delete campaign');
      }
    });
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

  const formatCount = (value) =>
    value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value || 0;

  return (
    <>
      {/* Custom Confirm Modal */}
      {confirmModal.open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={handleCancelConfirm}>
          <div className="gradient-ring bg-ink-850 rounded-2xl p-6 max-w-sm w-full shadow-card animate-pop-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white">{confirmModal.title}</h3>
            </div>
            <p className="text-sm text-slate-400 mb-6 text-left">{confirmModal.message}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={handleCancelConfirm} className="btn-secondary btn-md">Cancel</button>
              <button onClick={handleConfirm} className="btn-danger btn-md">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditMode}
        onClose={handleCancel}
        title="Edit Profile"
        subtitle={!profileData?.id ? 'Welcome! Please fill in your profile information to get started.' : 'Update how you appear across CollabHub.'}
        maxWidth="max-w-xl"
      >
        <div className="p-7 space-y-6">
          {/* Profile Picture */}
          <div>
            <label className="field-label mb-3">Profile Picture <span className="text-slate-500">(optional)</span></label>
            <div className="flex items-end gap-4">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center bg-gradient-to-br from-primary-600/40 to-violet-600/40">
                {profilePicPreview ? (
                  <img src={profilePicPreview} alt="Profile preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-white/60">{editFormData.display_name?.[0] || 'U'}</span>
                )}
              </div>
              <label className="flex-1 field cursor-pointer hover:bg-white/[0.07] text-center text-sm font-medium text-slate-300 hover:text-white">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePicChange}
                  className="hidden"
                />
                Upload Picture
              </label>
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className="field-label">Display Name <span className="text-rose-400">*</span></label>
            <input
              type="text"
              name="display_name"
              value={editFormData.display_name}
              onChange={handleEditFormChange}
              className="field"
              placeholder="Display name"
              required
            />
          </div>

          {/* Bio */}
          <div>
            <label className="field-label">Bio <span className="text-slate-500">(optional)</span></label>
            <textarea
              name="bio"
              value={editFormData.bio}
              onChange={handleEditFormChange}
              rows="4"
              className="field resize-none"
              placeholder="Tell us about yourself…"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-white/10">
            {profileData?.id && (
              <button onClick={handleCancel} disabled={isSaving} className="btn-secondary btn-md flex-1">
                Cancel
              </button>
            )}
            <button onClick={handleSaveProfile} disabled={isSaving} className="btn-primary btn-md flex-1">
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Content */}
      <div className="w-full pb-24">
        {/* ── Profile Hero ─────────────────────────────────────── */}
        <div className="relative">
          {/* Banner */}
          <div className="h-56 sm:h-64 relative overflow-hidden border-b border-white/[0.07]">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-900/40 via-ink-900 to-violet-900/30" />
            <div className="absolute inset-0 grid-bg" />
            <div className="absolute top-0 right-0 w-[32rem] h-[32rem] bg-gradient-to-l from-primary-500/15 to-transparent blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-violet-600/15 blur-3xl" />
          </div>

          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            {apiError && (
              <div className="alert-error mt-6 flex items-center">
                <span>{apiError}</span>
                <button className="ml-auto opacity-70 hover:opacity-100" onClick={() => setApiError(null)}>✕</button>
              </div>
            )}

            <div className="relative -mt-16 sm:-mt-20 flex flex-col sm:flex-row gap-6 sm:items-end pb-8 border-b border-white/[0.07]">
              {/* Avatar */}
              <div className="gradient-ring rounded-3xl shrink-0 w-32 h-32 sm:w-40 sm:h-40 bg-ink-900 p-1.5 shadow-card animate-fade-up">
                <div className="w-full h-full rounded-[1.15rem] overflow-hidden bg-gradient-to-br from-primary-700/60 to-violet-700/60">
                  <SafeImage
                    src={profileData?.avatar}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    fallback={
                      <div className="w-full h-full flex items-center justify-center text-5xl sm:text-6xl font-bold font-display text-white/80">
                        {profileData?.display_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                      </div>
                    }
                  />
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-left animate-fade-up" style={{ animationDelay: '.08s' }}>
                <div className="flex items-center gap-3 flex-wrap mb-1.5">
                  <h1 className="text-3xl sm:text-4xl font-bold text-white">
                    {profileData ? `${profileData.display_name || ''}` : 'Your Profile'}
                  </h1>
                  {profileData?.role && (
                    <span className={profileData.role === 'creator' ? 'chip-emerald capitalize' : 'chip-amber capitalize'}>
                      {profileData.role}
                    </span>
                  )}
                  {youtubeStatus?.connected && (
                    <span className="chip-indigo">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Verified analytics
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
                  {profileData?.bio || 'Building communities and creating authentic content that inspires millions. Partnering with brands that align with my values.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 shrink-0 animate-fade-up" style={{ animationDelay: '.14s' }}>
                {isOwnProfile ? (
                  <button onClick={() => setIsEditMode(true)} className="btn-primary btn-md">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Edit Profile
                  </button>
                ) : (
                  <button onClick={() => setShowCollabModal(true)} className="btn-primary btn-md">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Collaborate
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Main content ─────────────────────────────────────── */}
        <div className="max-w-6xl mx-auto px-5 sm:px-8 mt-10 space-y-10">
          {/* Portfolio Section */}
          <div className="glass p-6 sm:p-8">
            <div className="flex items-center justify-between mb-7 flex-wrap gap-3">
              <div className="text-left">
                <p className="eyebrow mb-1">Verified reach</p>
                <h2 className="text-2xl font-bold text-white">Portfolio</h2>
              </div>
              <div className="bg-white/[0.03] p-1 rounded-xl border border-white/[0.06] flex text-sm">
                {['YouTube', 'Instagram'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setPortfolioTab(tab)}
                    className={`px-5 py-2 rounded-lg font-semibold transition-all ${portfolioTab === tab
                      ? 'bg-white/10 text-white'
                      : 'text-slate-400 hover:text-white'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Portfolio Content */}
            {portfolioTab === 'YouTube' ? (
              <div className="space-y-6">
                {youtubeStatus?.connected && youtubeAnalytics?.connected ? (
                  <>
                    {/* Channel Info Bar */}
                    <div className="flex items-center gap-4 p-4 bg-white/[0.04] rounded-2xl border border-white/[0.06] flex-wrap">
                      <SafeImage
                        src={youtubeAnalytics.channel?.thumbnail}
                        alt="Channel"
                        className="w-12 h-12 rounded-full border-2 border-rose-500/30"
                        crossOrigin="anonymous"
                        fallback={
                          <div className="w-12 h-12 rounded-full border-2 border-rose-500/30 bg-rose-500/15 flex items-center justify-center text-rose-300 font-bold">
                            {youtubeAnalytics.channel?.title?.[0]?.toUpperCase() || 'Y'}
                          </div>
                        }
                      />
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-semibold text-white truncate">{youtubeAnalytics.channel?.title}</p>
                        <p className="text-xs text-slate-500">YouTube Channel</p>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        {youtubeAnalytics?.analytics_updated_at && (
                          <span className="text-xs text-slate-500">
                            Updated {new Date(youtubeAnalytics.analytics_updated_at).toLocaleDateString()}
                          </span>
                        )}
                        <span className="chip-emerald">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                          Connected
                        </span>
                        {isOwnProfile && (
                          <button onClick={disconnectYoutube} className="btn btn-sm text-slate-300 bg-white/5 border border-white/10 hover:bg-rose-500/15 hover:border-rose-500/30 hover:text-rose-300 rounded-lg">
                            Disconnect
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: 'Subscribers', value: youtubeAnalytics.channel?.subscriber_count, color: 'text-rose-300', glow: 'from-rose-500/10' },
                        { label: 'Total Views', value: youtubeAnalytics.channel?.view_count, color: 'text-primary-300', glow: 'from-primary-500/10' },
                        { label: 'Videos', value: youtubeAnalytics.channel?.video_count, color: 'text-emerald-300', glow: 'from-emerald-500/10' },
                      ].map((stat, idx) => (
                        <div key={idx} className={`relative overflow-hidden bg-white/[0.04] rounded-2xl p-5 border border-white/[0.06] text-left`}>
                          <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${stat.glow} to-transparent blur-xl`} />
                          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">{stat.label}</p>
                          <p className={`text-2xl font-bold font-display ${stat.color}`}>{formatCount(stat.value)}</p>
                        </div>
                      ))}
                    </div>

                    {/* Views Trend Chart */}
                    {youtubeAnalytics.analytics?.views_trend?.length > 0 && (
                      <div className="text-left">
                        <p className="text-xs text-slate-500 font-bold tracking-widest mb-3 uppercase">Views Trend (30 Days)</p>
                        <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/[0.06]">
                          <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={youtubeAnalytics.analytics.views_trend}>
                              <defs>
                                <linearGradient id="viewsGradientPortfolio" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#8290ff" stopOpacity={0.35} />
                                  <stop offset="95%" stopColor="#8290ff" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                              <Tooltip contentStyle={{ background: '#0c101d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }} />
                              <Area type="monotone" dataKey="views" stroke="#8290ff" fill="url(#viewsGradientPortfolio)" strokeWidth={2.5} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* Traffic Sources & Device Breakdown */}
                    <div className="grid sm:grid-cols-2 gap-5">
                      {youtubeAnalytics.analytics?.traffic_sources?.length > 0 && (
                        <div className="text-left">
                          <p className="text-xs text-slate-500 font-bold tracking-widest mb-3 uppercase">Traffic Sources</p>
                          <div className="space-y-2.5 bg-white/[0.03] rounded-2xl p-4 border border-white/[0.06]">
                            {youtubeAnalytics.analytics.traffic_sources.slice(0, 5).map((src, idx) => (
                              <div key={idx}>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-slate-300">{src.name}</span>
                                  <span className="text-primary-300 font-semibold">{src.value}%</span>
                                </div>
                                <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                                  <div className="bg-gradient-to-r from-primary-500 to-cyan-400 h-1.5 rounded-full transition-all duration-500" style={{ width: `${src.value}%` }}></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {youtubeAnalytics.analytics?.device_breakdown?.length > 0 && (
                        <div className="text-left">
                          <p className="text-xs text-slate-500 font-bold tracking-widest mb-3 uppercase">Devices</p>
                          <div className="space-y-2 bg-white/[0.03] rounded-2xl p-4 border border-white/[0.06]">
                            {youtubeAnalytics.analytics.device_breakdown.map((dev, idx) => {
                              const icons = { Mobile: '📱', Desktop: '🖥️', Tablet: '📟', Tv: '📺', 'Game Console': '🎮' };
                              return (
                                <div key={idx} className="flex items-center gap-2.5 p-2 bg-white/[0.03] rounded-lg">
                                  <span className="text-sm">{icons[dev.name] || '📟'}</span>
                                  <span className="text-xs text-slate-300 flex-1 text-left">{dev.name}</span>
                                  <span className="text-xs font-semibold text-violet-300">{dev.value}%</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Audience Insights */}
                    {(youtubeAnalytics.analytics?.audience_age?.length > 0 || youtubeAnalytics.analytics?.audience_gender || youtubeAnalytics.analytics?.audience_regions?.length > 0) && (
                      <div className="text-left">
                        <p className="text-xs text-slate-500 font-bold tracking-widest mb-3 uppercase">Audience Insights</p>
                        <div className="grid sm:grid-cols-2 gap-5">
                          {/* Age Distribution */}
                          {youtubeAnalytics.analytics?.audience_age?.length > 0 && (
                            <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/[0.06]">
                              <p className="text-xs text-slate-400 font-medium mb-3">Age Distribution</p>
                              <div className="space-y-2.5">
                                {youtubeAnalytics.analytics.audience_age.slice(0, 5).map((age, idx) => (
                                  <div key={idx}>
                                    <div className="flex justify-between text-xs mb-1">
                                      <span className="text-slate-300">{age.name}</span>
                                      <span className="text-primary-300 font-semibold">{age.value}%</span>
                                    </div>
                                    <div className="w-full bg-white/[0.06] rounded-full h-2 overflow-hidden">
                                      <div className="bg-gradient-to-r from-primary-500 to-primary-400 h-2 rounded-full transition-all duration-500" style={{ width: `${age.value}%` }}></div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Gender & Regions */}
                          <div className="space-y-5">
                            {/* Gender Split */}
                            <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/[0.06]">
                              <p className="text-xs text-slate-400 font-medium mb-3">Gender Split</p>
                              <div className="flex gap-2.5">
                                <div className="flex-1 bg-primary-600/15 border border-primary-600/30 rounded-xl p-2.5 text-center">
                                  <p className="text-xs text-slate-400 mb-1">Male</p>
                                  <p className="text-sm font-bold text-primary-300">{youtubeAnalytics.analytics?.audience_gender?.male || 0}%</p>
                                </div>
                                <div className="flex-1 bg-violet-600/15 border border-violet-600/30 rounded-xl p-2.5 text-center">
                                  <p className="text-xs text-slate-400 mb-1">Female</p>
                                  <p className="text-sm font-bold text-violet-300">{youtubeAnalytics.analytics?.audience_gender?.female || 0}%</p>
                                </div>
                              </div>
                            </div>
                            {/* Top Locations */}
                            {youtubeAnalytics.analytics?.audience_regions?.length > 0 && (
                              <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/[0.06]">
                                <p className="text-xs text-slate-400 font-medium mb-3">Top Locations</p>
                                <div className="space-y-1.5 text-xs">
                                  {youtubeAnalytics.analytics.audience_regions.slice(0, 5).map((region, idx) => (
                                    <div key={idx} className="flex justify-between text-slate-300">
                                      <span>🌐 {region.name}</span>
                                      <span className="text-slate-500 font-semibold">{region.value}%</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {youtubeAnalytics.token_error && (
                      <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs text-amber-300 flex items-center gap-2 flex-wrap">
                        <span>⚠️</span>
                        <span>Token expired. Please reconnect your YouTube account to refresh analytics.</span>
                        {isOwnProfile && (
                          <button onClick={connectYoutube} className="ml-auto px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 rounded-lg text-amber-200 font-medium transition-all">Reconnect</button>
                        )}
                      </div>
                    )}
                  </>
                ) : isOwnProfile ? (
                  <div className="text-center py-14">
                    <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-rose-500">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                      </svg>
                    </div>
                    <p className="text-white font-semibold mb-1">Showcase your verified reach</p>
                    <p className="text-slate-400 text-sm mb-6">Connect your YouTube channel to display first-party analytics.</p>
                    <button
                      onClick={connectYoutube}
                      disabled={loading || redirecting}
                      className="btn btn-lg text-white bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 shadow-lg shadow-rose-500/25 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {redirecting ? 'Redirecting…' : '▶ Connect YouTube Channel'}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-14 text-slate-500 text-sm">
                    <p>No YouTube channel connected</p>
                  </div>
                )}
              </div>
            ) : (
              /* Instagram Tab - Coming Soon */
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center opacity-60">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </div>
                <p className="text-slate-400 text-sm">Instagram analytics coming soon</p>
              </div>
            )}
          </div>

          {/* Created Projects Section */}
          {userProjects.length > 0 && (
            <div className="glass p-6 sm:p-8">
              <div className="text-left mb-7">
                <p className="eyebrow mb-1">Creator work</p>
                <h2 className="text-2xl font-bold text-white">Projects</h2>
              </div>
              <div className="stagger-children grid sm:grid-cols-2 gap-5">
                {userProjects.map(project => (
                  <div key={project.id} className="hover-lift glass card-hover overflow-hidden group">
                    {/* Project Image */}
                    <div className="relative h-40 bg-gradient-to-br from-primary-900/50 to-ink-900 cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
                      <SafeImage
                        src={project.image}
                        alt={project.project_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        fallback={
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-primary-500/25" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                            </svg>
                          </div>
                        }
                      />
                      {isOwnProfile && (
                        <div className="absolute top-2.5 right-2.5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project.id}`); }}
                            className="px-2.5 py-1 text-xs font-semibold bg-primary-500/85 hover:bg-primary-500 text-white rounded-lg backdrop-blur-sm transition-all"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }}
                            className="px-2.5 py-1 text-xs font-semibold bg-rose-500/85 hover:bg-rose-500 text-white rounded-lg backdrop-blur-sm transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Project Info */}
                    <div className="p-5 cursor-pointer text-left" onClick={() => navigate(`/projects/${project.id}`)}>
                      <h3 className="font-semibold text-white group-hover:text-primary-300 transition-colors">{project.project_name}</h3>
                      <p className="text-sm text-slate-400 mt-1 line-clamp-2">{project.description || 'No description'}</p>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {safeJsonParse(project.genre).map((g, idx) =>
                          g && <span key={`genre-${idx}`} className="chip-indigo">{g}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Created Campaigns Section */}
          {userCampaigns.length > 0 && (
            <div className="glass p-6 sm:p-8">
              <div className="text-left mb-7">
                <p className="eyebrow mb-1">Brand work</p>
                <h2 className="text-2xl font-bold text-white">{isOwnProfile ? 'My Campaigns' : 'Campaigns'}</h2>
              </div>
              <div className="stagger-children grid sm:grid-cols-2 gap-5">
                {userCampaigns.map(campaign => (
                  <div key={campaign.id} className="hover-lift glass overflow-hidden group transition-all duration-300 hover:bg-white/[0.05] hover:border-violet-500/30 hover:shadow-glow-violet">
                    {/* Campaign Image */}
                    <div className="relative h-40 bg-gradient-to-br from-violet-900/50 to-ink-900 cursor-pointer" onClick={() => navigate(`/campaigns/${campaign.id}`)}>
                      <SafeImage
                        src={campaign.image}
                        alt={campaign.campaign_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        fallback={
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-violet-500/25" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                            </svg>
                          </div>
                        }
                      />
                      {isOwnProfile && (
                        <div className="absolute top-2.5 right-2.5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/campaigns/${campaign.id}`); }}
                            className="px-2.5 py-1 text-xs font-semibold bg-violet-500/85 hover:bg-violet-500 text-white rounded-lg backdrop-blur-sm transition-all"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteCampaign(campaign.id); }}
                            className="px-2.5 py-1 text-xs font-semibold bg-rose-500/85 hover:bg-rose-500 text-white rounded-lg backdrop-blur-sm transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Campaign Info */}
                    <div className="p-5 cursor-pointer text-left" onClick={() => navigate(`/campaigns/${campaign.id}`)}>
                      <h3 className="font-semibold text-white group-hover:text-violet-300 transition-colors">{campaign.campaign_name}</h3>
                      <p className="text-sm text-slate-400 mt-1 line-clamp-2">{campaign.description || 'No description'}</p>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {safeJsonParse(campaign.platforms).map((p, idx) =>
                          p && <span key={`plat-${idx}`} className="chip-violet">{p}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state — own profile with no creations yet */}
          {isOwnProfile && !loadingCreations && userProjects.length === 0 && userCampaigns.length === 0 && (
            <div className="glass p-12 text-center">
              <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-2xl">✨</div>
              <p className="text-lg font-semibold text-white">
                {profileData?.role === 'creator' ? "You haven't posted any projects yet" : "You haven't posted any campaigns yet"}
              </p>
              <p className="text-sm text-slate-400 mt-1.5 mb-6">
                {profileData?.role === 'creator'
                  ? 'Share a project to start attracting brands.'
                  : 'Launch a campaign to start attracting creators.'}
              </p>
              <button onClick={() => navigate('/projects')} className="btn-primary btn-md">
                {profileData?.role === 'creator' ? 'Create a project' : 'Create a campaign'}
              </button>
            </div>
          )}

          {/* Recent Partners Section — real accepted collaborations, hidden when empty */}
          {partners.length > 0 && (
            <div className="glass p-6 sm:p-8">
              <div className="text-left mb-7">
                <p className="eyebrow mb-1">Track record</p>
                <h2 className="text-2xl font-bold text-white">Recent Partners</h2>
              </div>

              <div className="stagger-children grid grid-cols-2 sm:grid-cols-4 gap-4">
                {partners.slice(0, 8).map((partner) => (
                  <div
                    key={partner.id}
                    onClick={() => navigate(`/profile/${partner.id}`)}
                    className="hover-lift glass card-hover p-5 flex flex-col items-center justify-center gap-3 cursor-pointer"
                  >
                    <Avatar
                      src={partner.avatar}
                      name={partner.display_name}
                      className="w-12 h-12"
                      rounded="rounded-xl"
                    />
                    <p className="text-sm font-semibold text-center truncate w-full text-white">{partner.display_name || 'Unknown'}</p>
                    {partner.role && <p className="text-xs text-slate-500 -mt-1 capitalize">{partner.role}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Collaboration Modal */}
      <CollaborationModal
        isOpen={showCollabModal}
        onClose={() => setShowCollabModal(false)}
        receiverId={userId}
        receiverName={profileData?.display_name}
      />
    </>
  );
}
