import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import CapsuleSelector from '../../components/CapsuleSelector';
import SafeImage from '../../components/SafeImage';
import { PageHeader, Segmented, Modal, Avatar } from '../../components/ui';

export default function Projects() {
  const [activeTab, setActiveTab] = useState('projects');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [creatorId, setCreatorId] = useState(null);
  const [brandId, setBrandId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_aud: [],
    genre: [],
    platforms: [],
    imageFile: null
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (user) {
      fetchUserMappings();
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchUserMappings = async () => {
    const { data: creatorData } = await supabase.from('creators').select('id').eq('user_id', user.id).single();
    if (creatorData) setCreatorId(creatorData.id);

    const { data: brandData } = await supabase.from('brands').select('id').eq('user_id', user.id).single();
    if (brandData) setBrandId(brandData.id);
  };

  const fetchData = async () => {
    setLoading(true);
    let data, error;

    if (activeTab === 'projects') {
      ({ data, error } = await supabase
        .from('projects')
        .select('*, creators(id, user_id, users(id, display_name, role, avatar, bio))')
        .order('created_at', { ascending: false }));
    } else {
      ({ data, error } = await supabase
        .from('campaigns')
        .select('*, brands(id, user_id, users(id, display_name, role, avatar, bio))')
        .order('created_at', { ascending: false }));
    }

    if (!error && data) {
      setItems(data);
    } else {
      setItems([]);
    }
    setLoading(false);
  };

  // Helper to extract the user info from the joined data
  const getOwner = (item) => {
    if (activeTab === 'projects') {
      return item.creators?.users || null;
    } else {
      return item.brands?.users || null;
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, imageFile: file }));
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

      // The presigned PUT URL points at the object; strip the query string to
      // get the public object URL (no bucket/region env vars required).
      return putResponse.url.split('?')[0];
    } catch (err) {
      console.error('Error uploading image:', err);
      throw new Error('Failed to upload image');
    }
  };

  const handleCapsuleChange = (fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (activeTab === 'projects' && !creatorId) {
      setFormError('No creator profile found. You must be a creator to create a project.');
      return;
    }
    if (activeTab === 'campaigns' && !brandId) {
      setFormError('No brand profile found. You must be a brand to create a campaign.');
      return;
    }

    setSubmitting(true);

    try {
      let imageUrl = null;
      if (formData.imageFile) {
        imageUrl = await uploadImageToS3(formData.imageFile);
      }

      const table = activeTab === 'projects' ? 'projects' : 'campaigns';
      const insertPayload = activeTab === 'projects'
        ? {
            project_name: formData.title,
            description: formData.description,
            target_aud: formData.target_aud,
            genre: formData.genre,
            platforms: formData.platforms,
            image: imageUrl,
            creator_id: creatorId
          }
        : {
            campaign_name: formData.title,
            description: formData.description,
            target_aud: formData.target_aud,
            genre: formData.genre,
            platforms: formData.platforms,
            image: imageUrl,
            brand_id: brandId
          };

      const { data, error } = await supabase.from(table).insert([insertPayload]).select();

      if (!error && data) {
        setItems(prev => [data[0], ...prev]);
        setIsModalOpen(false);
        setFormData({
          title: '',
          description: '',
          target_aud: [],
          genre: [],
          platforms: [],
          imageFile: null
        });
        setImagePreview(null);
      } else {
        console.error(`Error creating ${activeTab}:`, error);
        setFormError(`Failed to create ${activeTab === 'projects' ? 'project' : 'campaign'}. Please try again.`);
      }
    } catch (err) {
      console.error('Error:', err);
      setFormError(err.message || 'An error occurred');
    }
    setSubmitting(false);
  };

  const filteredItems = items.filter(item => {
    const name = activeTab === 'projects' ? item.project_name : item.campaign_name;
    return name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const itemNameTitle = activeTab === 'projects' ? 'Project' : 'Campaign';
  const itemNamePlural = activeTab === 'projects' ? 'Projects' : 'Campaigns';
  const canCreate = (activeTab === 'projects' && creatorId) || (activeTab === 'campaigns' && brandId);

  // Safe JSON parsing helper
  const safeJsonParse = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [value]; // Return the string as a single item if parsing fails
      }
    }
    return [];
  };

  return (
    <>
      <div className="max-w-7xl mx-auto w-full px-5 sm:px-8 py-10 flex flex-col gap-8 relative pb-24">

        {/* Header */}
        <PageHeader
          eyebrow="Discover"
          title={activeTab === 'projects' ? 'Creator Projects' : 'Brand Campaigns'}
          subtitle={`Discover and explore all available ${itemNamePlural.toLowerCase()} across the network.`}
          actions={canCreate && (
            <button onClick={() => { setFormError(''); setIsModalOpen(true); }} className="btn-primary btn-md">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New {itemNameTitle}
            </button>
          )}
        />

        {/* Tabs + Search */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 border-b border-white/[0.07] pb-8">
          <Segmented
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { key: 'projects', label: 'Creator Projects' },
              { key: 'campaigns', label: 'Brand Campaigns' },
            ]}
          />
          <div className="relative flex-1 md:max-w-md md:ml-auto">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-[18px] h-[18px] text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${itemNamePlural.toLowerCase()}…`}
              className="field pl-11"
            />
          </div>
        </div>

        {/* List Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass overflow-hidden">
                <div className="skeleton h-44 w-full" />
                <div className="p-6 space-y-3">
                  <div className="skeleton h-4 w-1/3 rounded" />
                  <div className="skeleton h-5 w-2/3 rounded-lg" />
                  <div className="skeleton h-3 w-full rounded" />
                  <div className="skeleton h-3 w-4/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="glass p-14 text-center text-slate-400">
            {searchQuery ? `No ${itemNamePlural.toLowerCase()} found matching your search.` : `No ${itemNamePlural.toLowerCase()} found. Be the first to create one!`}
          </div>
        ) : (
          <div className="stagger-children grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredItems.map(item => {
              const owner = getOwner(item);
              const name = (activeTab === 'projects' ? item.project_name : item.campaign_name) || `Untitled ${itemNameTitle}`;
              return (
                <div
                  key={item.id}
                  className="hover-lift glass card-hover overflow-hidden cursor-pointer group flex flex-col"
                  onClick={() => navigate(`/${activeTab}/${item.id}`)}
                >
                  <div className="h-44 w-full overflow-hidden bg-gradient-to-br from-primary-900/40 to-violet-900/30 border-b border-white/[0.07] shrink-0 relative">
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
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-950/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="p-6 flex flex-col grow text-left">
                    {/* Owner Info */}
                    {owner && (
                      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/[0.05]">
                        <Avatar src={owner.avatar} name={owner.display_name} className="w-9 h-9" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{owner.display_name || 'Unknown'}</p>
                          <p className="text-xs text-slate-500 truncate capitalize">{owner.role || 'Member'}</p>
                        </div>
                      </div>
                    )}

                    <h3 className="text-lg font-bold text-white mb-2.5 truncate group-hover:text-primary-300 transition-colors" title={name}>
                      {name}
                    </h3>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {safeJsonParse(item.target_aud).map((aud, idx) =>
                        aud && <span key={`aud-${idx}`} className="chip-emerald">{aud}</span>
                      )}
                      {safeJsonParse(item.genre).map((g, idx) =>
                        g && <span key={`genre-${idx}`} className="chip-indigo">{g}</span>
                      )}
                      {safeJsonParse(item.platforms).map((p, idx) =>
                        p && <span key={`plat-${idx}`} className="chip-violet">{p}</span>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm line-clamp-3 mb-5 grow leading-relaxed">
                      {item.description || 'No description provided.'}
                    </p>
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

      {/* Floating Action Button — quick-create for mobile, gated to the role
          that can create on this tab (creators → projects, brands → campaigns). */}
      {canCreate && (
        <button
          onClick={() => { setFormError(''); setIsModalOpen(true); }}
          className="sm:hidden fixed bottom-6 right-6 z-40 btn-primary w-14 h-14 !rounded-full !p-0 text-2xl font-light"
          title={`Create new ${itemNameTitle.toLowerCase()}`}
        >
          +
        </button>
      )}

      {/* Create Modal — styled as an editorial "compose" layout rather than a stacked form */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Create New ${itemNameTitle}`}
        subtitle={activeTab === 'projects' ? 'Share what you are building and attract brand partners.' : 'Launch a campaign and attract the right creators.'}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col">
          {formError && <div className="alert-error !p-3 mx-7 mt-7">{formError}</div>}

          {/* Cover image */}
          <label className="relative block mx-7 mt-7 h-52 sm:h-60 rounded-2xl border-2 border-dashed border-white/15 hover:border-primary-500/50 bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer overflow-hidden group shrink-0">
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            {imagePreview ? (
              <>
                <img src={imagePreview} alt="Cover preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-ink-950/0 group-hover:bg-ink-950/60 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-semibold flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Change cover image
                  </span>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-500 group-hover:text-primary-300 transition-colors">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-semibold">Add a cover image</span>
                <span className="text-xs text-slate-600">Optional — helps your {itemNameTitle.toLowerCase()} stand out</span>
              </div>
            )}
          </label>

          {/* Title + description, editorial style */}
          <div className="px-7 pt-8">
            <p className="eyebrow mb-3">{itemNameTitle} Details</p>
            <input
              required
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder={`${itemNameTitle} title…`}
              className="w-full bg-transparent outline-none text-3xl font-display font-bold text-white placeholder-slate-600 border-b border-white/10 focus:border-primary-500/60 pb-3 transition-colors"
            />
            <textarea
              rows="3"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder={`Tell brand partners what this ${itemNameTitle.toLowerCase()} is about…`}
              className="w-full bg-transparent outline-none resize-none text-slate-300 text-lg leading-relaxed placeholder-slate-600 mt-5"
            ></textarea>
          </div>

          {/* Tags / metadata */}
          <div className="mx-7 mt-6 mb-7 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-6">
            <p className="eyebrow">Audience &amp; Tags</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <CapsuleSelector
                label="Target Audience"
                placeholder="Add audience (e.g., Teenagers, Professionals)..."
                value={formData.target_aud}
                onChange={(value) => handleCapsuleChange('target_aud', value)}
                presetOptions={['Teenagers', 'Adults', 'Professionals', 'Kids', 'Students', 'Gaming Enthusiasts', 'Artists', 'Businesses']}
              />
              <CapsuleSelector
                label="Genre"
                placeholder="Add genre (e.g., RPG, Productivity)..."
                value={formData.genre}
                onChange={(value) => handleCapsuleChange('genre', value)}
                presetOptions={['Action', 'Adventure', 'RPG', 'Strategy', 'Simulation', 'Casual', 'Puzzle', 'Sports', 'Productivity', 'Education', 'Comedy', 'Drama']}
              />
            </div>

            <CapsuleSelector
              label="Platforms"
              placeholder="Add platform (e.g., iOS, Android, Web)..."
              value={formData.platforms}
              onChange={(value) => handleCapsuleChange('platforms', value)}
              presetOptions={['iOS', 'Android', 'Web', 'Windows', 'Mac', 'Linux', 'PlayStation', 'Xbox', 'Nintendo Switch']}
            />
          </div>

          <div className="px-7 py-5 border-t border-white/10 flex justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary btn-md">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary btn-md">
              {submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
              {submitting ? 'Creating…' : `Create ${itemNameTitle}`}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
