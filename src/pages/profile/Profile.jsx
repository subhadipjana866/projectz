import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import CollaborationModal from '../../components/CollaborationModal';

// Backend API calls go through vite proxy, no need for full URL

export default function Profile() {
  const { user, signOut } = useAuth();
  // console.log("Profile component - user:", session, user);
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
        console.log('Profile initialized');
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
        const response = await fetch(`/api/signUploadUrl`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ fileName: editFormData.avatar.name, fileType: editFormData.avatar.type, userFirstName: user.id })
        });

        // use the signed url to upload the file to s3
        const { url, key } = await response.json();
        console.log("Got upload URL:", url);
        console.log("Got file URL:", key);
        const response2 = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': editFormData.avatar.type },
          body: editFormData.avatar
        });
        avatar_url = response2.url.split('?')[0]; // Get the URL without query params
        console.log("Upload response:", response2);
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



  return (
    <>
      {/* Custom Confirm Modal */}
      {confirmModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={handleCancelConfirm}>
          <div className="bg-[#101622] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white">{confirmModal.title}</h3>
            </div>
            <p className="text-sm text-slate-400 mb-6 text-left">{confirmModal.message}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelConfirm}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-sm font-medium text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-red-500/20"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">
        {apiError && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-100 p-4 rounded-xl flex items-center shadow-[0_0_15px_rgba(239,68,68,0.2)]">
            <span>{apiError}</span>
            <button className="ml-auto opacity-70 hover:opacity-100" onClick={() => setApiError(null)}>✕</button>
          </div>
        )}

        {/* Edit Modal */}
        {isEditMode && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#101622] border border-white/10 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white text-left mb-2">Edit Profile</h2>
                {!profileData?.id && (
                  <p className="text-sm text-slate-400">Welcome! Please fill in your profile information to get started.</p>
                )}
              </div>

              <div className="space-y-6">
                {/* Profile Picture */}
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-3 text-left">Profile Picture <span className="text-slate-400">(optional)</span></label>
                  <div className="flex items-end gap-4">
                    <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-white/10 flex items-center justify-center bg-slate-700">
                      {profilePicPreview ? (
                        <img src={profilePicPreview} alt="Profile preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl font-bold text-white/50">{editFormData.display_name?.[0] || 'U'}</span>
                      )}
                    </div>
                    <label className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg cursor-pointer transition-all text-center text-sm font-medium text-white">
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

                {/* First Name */}
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-2 text-left">Display Name <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    name="display_name"
                    value={editFormData.display_name}
                    onChange={handleEditFormChange}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Display name"
                    required
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-2 text-left">Bio <span className="text-slate-400">(optional)</span></label>
                  <textarea
                    name="bio"
                    value={editFormData.bio}
                    onChange={handleEditFormChange}
                    rows="4"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  {profileData?.id && (
                    <button
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-white font-medium transition-all disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="flex-1 px-4 py-2 bg-[#1152d4] hover:bg-blue-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile Header Section */}
        <div className="space-y-0">
          {/* Banner with Profile Overlay */}
          <div className="relative group">
            {/* Banner Background */}
            <div className="backdrop-blur-sm bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded-t-3xl overflow-hidden h-64">
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-blue-500/5 to-transparent opacity-40"></div>
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-l from-blue-500/20 to-transparent blur-3xl"></div>
            </div>

            {/* Profile Card Overlay */}
            <div className="relative -mt-20 mx-8 pb-8">
              <div className="flex gap-6 items-end">
                {/* Avatar */}
                <div className="border-4 border-[#101622] bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl overflow-hidden shadow-2xl shrink-0">
                  {profileData?.avatar ? (
                    <img src={profileData.avatar} alt="Profile" className="w-40 h-40 object-cover" />
                  ) : (
                    <div className="w-40 h-40 flex items-center justify-center text-6xl font-bold">
                      {profileData?.display_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>

                {/* Profile Info */}
                <div className="flex-1 pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-4xl font-bold">
                      {profileData
                        ? `${profileData.display_name || ''}`
                        : 'Your Profile'}
                    </h1>

                  </div>
                  <p className="text-slate-300 text-lg mb-2 text-left">{profileData?.role?.toUpperCase()}</p>
                  <p className="text-slate-400 text-sm max-w-2xl mb-4 text-left">
                    {profileData?.bio || 'Building communities and creating authentic content that inspires millions. Partnering with brands that align with my values.'}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pb-2 shrink-0">
                  {isOwnProfile && (
                    <button
                      onClick={() => setIsEditMode(true)}
                      className="px-6 py-2 bg-[#1152d4] hover:bg-blue-700 text-white font-semibold rounded-lg transition-all shadow-lg shadow-blue-500/20"
                    >
                      Edit
                    </button>
                  )}
                  {!isOwnProfile && (
                    <button
                      onClick={() => setShowCollabModal(true)}
                      className="px-5 py-2 backdrop-blur-sm bg-[rgba(17,82,212,0.15)] border border-[rgba(17,82,212,0.3)] hover:bg-[rgba(17,82,212,0.3)] text-white rounded-lg transition-all flex items-center gap-2 font-medium text-sm shadow-lg shadow-blue-500/10"
                    >
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


        </div>

        {/* Main Grid */}
        <div className="space-y-8">
          {/* Left Column - Portfolio & YouTube Integration */}
          <div className="space-y-8">
            {/* Portfolio Section */}
            <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded-2xl p-8 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" />
                  </svg>
                  <h2 className="text-2xl font-bold">Portfolio</h2>
                </div>
                <div className="flex gap-2">
                  {['YouTube', 'Instagram'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setPortfolioTab(tab)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${portfolioTab === tab
                        ? 'bg-[#1152d4] text-white shadow-lg shadow-blue-500/20'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10'
                        }`}
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
                      <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
                        {youtubeAnalytics.channel?.thumbnail && (
                          <img src={youtubeAnalytics.channel.thumbnail} alt="Channel" className="w-12 h-12 rounded-full border-2 border-red-500/30" crossOrigin="anonymous" />
                        )}
                        <div className="flex-1">
                          <p className="font-semibold text-white text-left">{youtubeAnalytics.channel?.title}</p>
                          <p className="text-xs text-slate-400 text-left">YouTube Channel</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {youtubeAnalytics?.analytics_updated_at && (
                            <span className="text-xs text-slate-500">
                              Updated {new Date(youtubeAnalytics.analytics_updated_at).toLocaleDateString()}
                            </span>
                          )}
                          <span className="inline-flex items-center px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-xs font-semibold text-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2 animate-pulse"></span>
                            Connected
                          </span>
                          {isOwnProfile && (
                            <button onClick={disconnectYoutube} className="px-3 py-1.5 text-xs bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 rounded-lg text-slate-300 hover:text-red-300 transition-all">
                              Disconnect
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'Subscribers', value: youtubeAnalytics.channel?.subscriber_count, color: 'text-red-400', border: 'border-l-red-500' },
                          { label: 'Total Views', value: youtubeAnalytics.channel?.view_count, color: 'text-blue-400', border: 'border-l-blue-500' },
                          { label: 'Videos', value: youtubeAnalytics.channel?.video_count, color: 'text-emerald-400', border: 'border-l-emerald-500' },
                        ].map((stat, idx) => (
                          <div key={idx} className={`bg-white/5 rounded-xl p-4 border-l-4 ${stat.border} border border-white/5`}>
                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">{stat.label}</p>
                            <p className={`text-xl font-bold ${stat.color}`}>
                              {stat.value >= 1000000 ? `${(stat.value / 1000000).toFixed(1)}M` : stat.value >= 1000 ? `${(stat.value / 1000).toFixed(1)}K` : stat.value || 0}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Views Trend Chart */}
                      {youtubeAnalytics.analytics?.views_trend?.length > 0 && (
                        <div>
                          <p className="text-xs text-slate-400 font-bold tracking-wider mb-3 uppercase">Views Trend (30 Days)</p>
                          <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                            <ResponsiveContainer width="100%" height={200}>
                              <AreaChart data={youtubeAnalytics.analytics.views_trend}>
                                <defs>
                                  <linearGradient id="viewsGradientPortfolio" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
                                <Area type="monotone" dataKey="views" stroke="#ef4444" fill="url(#viewsGradientPortfolio)" strokeWidth={2} />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {/* Traffic Sources & Device Breakdown */}
                      <div className="grid grid-cols-2 gap-4">
                        {youtubeAnalytics.analytics?.traffic_sources?.length > 0 && (
                          <div>
                            <p className="text-xs text-slate-400 font-bold tracking-wider mb-3 uppercase">Traffic Sources</p>
                            <div className="space-y-2">
                              {youtubeAnalytics.analytics.traffic_sources.slice(0, 5).map((src, idx) => (
                                <div key={idx}>
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-300">{src.name}</span>
                                    <span className="text-blue-400 font-semibold">{src.value}%</span>
                                  </div>
                                  <div className="w-full bg-slate-700/30 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-1.5 rounded-full transition-all duration-500" style={{ width: `${src.value}%` }}></div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {youtubeAnalytics.analytics?.device_breakdown?.length > 0 && (
                          <div>
                            <p className="text-xs text-slate-400 font-bold tracking-wider mb-3 uppercase">Devices</p>
                            <div className="space-y-2">
                              {youtubeAnalytics.analytics.device_breakdown.map((dev, idx) => {
                                const icons = { Mobile: '📱', Desktop: '🖥️', Tablet: '📟', Tv: '📺', 'Game Console': '🎮' };
                                return (
                                  <div key={idx} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                                    <span className="text-sm">{icons[dev.name] || '📟'}</span>
                                    <span className="text-xs text-slate-300 flex-1">{dev.name}</span>
                                    <span className="text-xs font-semibold text-purple-400">{dev.value}%</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Audience Insights */}
                      {(youtubeAnalytics.analytics?.audience_age?.length > 0 || youtubeAnalytics.analytics?.audience_gender || youtubeAnalytics.analytics?.audience_regions?.length > 0) && (
                        <div>
                          <p className="text-xs text-slate-400 font-bold tracking-wider mb-3 uppercase">Audience Insights</p>
                          <div className="grid grid-cols-2 gap-4">
                            {/* Age Distribution */}
                            {youtubeAnalytics.analytics?.audience_age?.length > 0 && (
                              <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                <p className="text-xs text-slate-400 font-medium mb-3">Age Distribution</p>
                                <div className="space-y-2">
                                  {youtubeAnalytics.analytics.audience_age.slice(0, 5).map((age, idx) => (
                                    <div key={idx}>
                                      <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-300">{age.name}</span>
                                        <span className="text-blue-400 font-semibold">{age.value}%</span>
                                      </div>
                                      <div className="w-full bg-slate-700/30 rounded-full h-2 overflow-hidden">
                                        <div className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-500" style={{ width: `${age.value}%` }}></div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Gender & Regions */}
                            <div className="space-y-4">
                              {/* Gender Split */}
                              <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                <p className="text-xs text-slate-400 font-medium mb-3">Gender Split</p>
                                <div className="flex gap-2">
                                  <div className="flex-1 bg-blue-600/20 border border-blue-600/40 rounded-lg p-2 text-center">
                                    <p className="text-xs text-slate-400 mb-1">Male</p>
                                    <p className="text-sm font-bold text-blue-400">{youtubeAnalytics.analytics?.audience_gender?.male || 0}%</p>
                                  </div>
                                  <div className="flex-1 bg-purple-600/20 border border-purple-600/40 rounded-lg p-2 text-center">
                                    <p className="text-xs text-slate-400 mb-1">Female</p>
                                    <p className="text-sm font-bold text-purple-400">{youtubeAnalytics.analytics?.audience_gender?.female || 0}%</p>
                                  </div>
                                </div>
                              </div>
                              {/* Top Locations */}
                              {youtubeAnalytics.analytics?.audience_regions?.length > 0 && (
                                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                  <p className="text-xs text-slate-400 font-medium mb-3">Top Locations</p>
                                  <div className="space-y-1 text-xs">
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
                        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300 flex items-center gap-2">
                          <span>⚠️</span>
                          <span>Token expired. Please reconnect your YouTube account to refresh analytics.</span>
                          {isOwnProfile && (
                            <button onClick={connectYoutube} className="ml-auto px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 rounded text-amber-200 font-medium transition-all">Reconnect</button>
                          )}
                        </div>
                      )}
                    </>
                  ) : isOwnProfile ? (
                    <div className="text-center py-12">
                      <svg viewBox="0 0 24 24" className="w-12 h-12 fill-red-600 mx-auto mb-4 opacity-50">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                      </svg>
                      <p className="text-slate-400 text-sm mb-4">Connect your YouTube channel to display analytics</p>
                      <button
                        onClick={connectYoutube}
                        disabled={loading || redirecting}
                        className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/20 hover:shadow-red-500/30"
                      >
                        {redirecting ? 'Redirecting...' : '▶ Connect YouTube Channel'}
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-500 text-sm">
                      <p>No YouTube channel connected</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Instagram Tab - Coming Soon */
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center opacity-50">
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
              <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded-2xl p-8 backdrop-blur-sm">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" />
                  </svg>
                  Projects
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {userProjects.map(project => (
                    <div key={project.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/[0.07] transition-all group">
                      {/* Project Image */}
                      <div className="relative h-40 bg-gradient-to-br from-blue-900/50 to-slate-900 cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
                        {project.image ? (
                          <img src={project.image} alt={project.project_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-blue-500/30" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                            </svg>
                          </div>
                        )}
                        {isOwnProfile && (
                          <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project.id}`); }}
                              className="px-2.5 py-1 text-xs bg-blue-500/80 hover:bg-blue-500 text-white rounded-md backdrop-blur-sm transition-all"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }}
                              className="px-2.5 py-1 text-xs bg-red-500/80 hover:bg-red-500 text-white rounded-md backdrop-blur-sm transition-all"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                      {/* Project Info */}
                      <div className="p-4 cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
                        <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors text-left">{project.project_name}</h3>
                        <p className="text-sm text-slate-400 mt-1 line-clamp-2 text-left">{project.description || 'No description'}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {safeJsonParse(project.genre).map((g, idx) =>
                            g && <span key={`genre-${idx}`} className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-300">{g}</span>
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
              <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded-2xl p-8 backdrop-blur-sm">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <svg className="w-6 h-6 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-13c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z" />
                  </svg>
                  {isOwnProfile ? 'My Campaigns' : 'Campaigns'}
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {userCampaigns.map(campaign => (
                    <div key={campaign.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/[0.07] transition-all group">
                      {/* Campaign Image */}
                      <div className="relative h-40 bg-gradient-to-br from-purple-900/50 to-slate-900 cursor-pointer" onClick={() => navigate(`/campaigns/${campaign.id}`)}>
                        {campaign.image ? (
                          <img src={campaign.image} alt={campaign.campaign_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-purple-500/30" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                            </svg>
                          </div>
                        )}
                        {isOwnProfile && (
                          <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/campaigns/${campaign.id}`); }}
                              className="px-2.5 py-1 text-xs bg-purple-500/80 hover:bg-purple-500 text-white rounded-md backdrop-blur-sm transition-all"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteCampaign(campaign.id); }}
                              className="px-2.5 py-1 text-xs bg-red-500/80 hover:bg-red-500 text-white rounded-md backdrop-blur-sm transition-all"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                      {/* Campaign Info */}
                      <div className="p-4 cursor-pointer" onClick={() => navigate(`/campaigns/${campaign.id}`)}>
                        <h3 className="font-semibold text-white group-hover:text-purple-400 transition-colors text-left">{campaign.campaign_name}</h3>
                        <p className="text-sm text-slate-400 mt-1 line-clamp-2 text-left">{campaign.description || 'No description'}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {safeJsonParse(campaign.platforms).map((p, idx) =>
                            p && <span key={`plat-${idx}`} className="inline-flex items-center px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-300">{p}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>


        </div>

        {/* Recent Partners Section */}
        <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded-2xl p-8 backdrop-blur-sm">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
            </svg>
            Recent Partners
          </h2>

          <div className="grid grid-cols-4 gap-4">
            {['TechCore', 'CreatorPro', 'Lumix Pro', 'StudioTech'].map((partner, idx) => (
              <div
                key={idx}
                className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center gap-3 hover:bg-white/10 transition-all cursor-pointer"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-xs font-bold">
                  {partner[0]}
                </div>
                <p className="text-sm font-semibold text-center">{partner}</p>
              </div>
            ))}
          </div>
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
