import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import CapsuleSelector from '../../components/CapsuleSelector';

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

      // Return the S3 URL (without query params)
      return `https://${import.meta.env.VITE_S3_BUCKET_NAME}.s3.${import.meta.env.VITE_S3_REGION}.amazonaws.com/${key}`;
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
    
    if (activeTab === 'projects' && !creatorId) {
      alert("No creator profile found. You must be a creator to create a project.");
      return;
    }
    if (activeTab === 'campaigns' && !brandId) {
      alert("No brand profile found. You must be a brand to create a campaign.");
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
        alert(`Failed to create ${activeTab === 'projects' ? 'project' : 'campaign'}.`);
      }
    } catch (err) {
      console.error('Error:', err);
      alert(err.message || 'An error occurred');
    }
    setSubmitting(false);
  };



  const filteredItems = items.filter(item => {
    const name = activeTab === 'projects' ? item.project_name : item.campaign_name;
    return name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const itemNameTitle = activeTab === 'projects' ? 'Project' : 'Campaign';
  const itemNamePlural = activeTab === 'projects' ? 'Projects' : 'Campaigns';

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
      <div className="max-w-7xl mx-auto px-8 py-8 flex flex-col gap-8 relative pb-24">
        
        {/* Toggle Tabs */}
        <div className="flex justify-center mb-4">
          <div className="bg-[rgba(255,255,255,0.05)] backdrop-blur-md p-1.5 rounded-xl border border-white/10 flex">
            <button
              onClick={() => setActiveTab('projects')}
              className={`px-8 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'projects' ? 'bg-[#1152d4] text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              Creator Projects
            </button>
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`px-8 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'campaigns' ? 'bg-[#1152d4] text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              Brand Campaigns
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="border-b border-white/10 pb-8 mt-4">
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-white tracking-tight text-left">{itemNamePlural}</h1>
            <p className="mt-2 text-lg text-slate-400 text-left">Discover and explore all available {itemNamePlural.toLowerCase()}.</p>
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
                placeholder={`Search ${itemNamePlural.toLowerCase()} by name...`}
                className="w-full pl-11 pr-4 py-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded-xl text-base text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all backdrop-blur-sm shadow-inner shadow-black/20"
              />
          </div>
        </div>

        {/* List Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded-2xl p-12 text-center text-slate-400 backdrop-blur-sm">
            {searchQuery ? `No ${itemNamePlural.toLowerCase()} found matching your search.` : `No ${itemNamePlural.toLowerCase()} found. Be the first to create one!`}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredItems.map(item => (
              <div 
                key={item.id} 
                className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded-2xl overflow-hidden hover:bg-[rgba(255,255,255,0.05)] transition-all cursor-pointer group flex flex-col backdrop-blur-sm hover:shadow-2xl shadow-black/50"
                onClick={() => navigate(`/${activeTab}/${item.id}`)}
              >
                {item.image ? (
                  <div className="h-48 w-full overflow-hidden bg-slate-900 border-b border-white/10 shrink-0">
                    <img src={item.image} alt={activeTab === 'projects' ? item.project_name : item.campaign_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100" />
                  </div>
                ) : (
                  <div className="h-48 w-full bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-b border-white/10 flex items-center justify-center p-6 text-center shrink-0">
                    <span className="text-6xl text-slate-600 group-hover:text-blue-500/50 transition-colors">📄</span>
                  </div>
                )}
                <div className="p-6 flex flex-col grow">
                  {/* Owner Info */}
                  {(() => {
                    const owner = getOwner(item);
                    return owner ? (
                      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/5">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shrink-0 border border-white/10">
                          {owner.avatar ? (
                            <img src={owner.avatar} alt={owner.display_name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white text-sm font-bold">{owner.display_name?.[0]?.toUpperCase() || '?'}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{owner.display_name || 'Unknown'}</p>
                          <p className="text-xs text-slate-500 truncate">{owner.role || 'Member'}</p>
                        </div>
                      </div>
                    ) : null;
                  })()}

                  <h3 className="text-xl font-bold text-white mb-2 truncate group-hover:text-blue-400 transition-colors" title={(activeTab === 'projects' ? item.project_name : item.campaign_name) || `Untitled ${itemNameTitle}`}>
                    {(activeTab === 'projects' ? item.project_name : item.campaign_name) || `Untitled ${itemNameTitle}`}
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {/* Target Audience Capsules */}
                    {item.target_aud && safeJsonParse(item.target_aud).map((aud, idx) => 
                      aud && <span key={`aud-${idx}`} className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-green-500/20 text-green-300 border border-green-500/30">{aud}</span>
                    )}
                    {/* Genre Capsules */}
                    {item.genre && safeJsonParse(item.genre).map((g, idx) => 
                      g && <span key={`genre-${idx}`} className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">{g}</span>
                    )}
                    {/* Platforms Capsules */}
                    {item.platforms && safeJsonParse(item.platforms).map((p, idx) => 
                      p && <span key={`plat-${idx}`} className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">{p}</span>
                    )}
                  </div>
                  <p className="text-slate-400 text-sm line-clamp-3 mb-4 grow">
                    {item.description || 'No description provided.'}
                  </p>
                  <div className="mt-auto text-xs font-medium text-slate-500 flex items-center justify-between">
                    <span>{new Date(item.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    <span className="group-hover:text-blue-400 transition-colors">View Details →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 right-8 bg-[#1152d4] hover:bg-blue-700 text-white w-16 h-16 rounded-full shadow-lg shadow-blue-500/20 flex items-center justify-center text-3xl font-light hover:scale-110 active:scale-95 transition-all outline-none focus:ring-4 focus:ring-blue-500/50 border border-blue-400/30"
        title={`Create new ${itemNameTitle.toLowerCase()}`}
      >
        +
      </button>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#101622] rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-white/10">
            <div className="px-8 py-6 border-b border-white/10 flex justify-between items-center bg-[rgba(255,255,255,0.02)]">
              <h2 className="text-2xl font-bold text-white">Create New {itemNameTitle}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white outline-none p-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center w-8 h-8">
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">{itemNameTitle} Name <span className="text-red-400">*</span></label>
                <input required type="text" name="title" value={formData.title} onChange={handleInputChange} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white placeholder-slate-500" placeholder={`e.g. ${itemNameTitle} Alpha`}/>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Description</label>
                <textarea rows="3" name="description" value={formData.description} onChange={handleInputChange} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none text-white placeholder-slate-500" placeholder={`What is this ${itemNameTitle.toLowerCase()} about?`}></textarea>
              </div>

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
                    {formData.imageFile ? 'Change Image' : 'Choose Image'}
                  </label>
                </div>
              </div>
              
              <div className="pt-6 mt-8 border-t border-white/10 flex justify-end gap-4 pb-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-semibold text-slate-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-all">Cancel</button>
                <button type="submit" disabled={submitting} className="px-6 py-2.5 text-sm font-semibold text-white bg-[#1152d4] rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
                  {submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
                  {submitting ? 'Creating...' : `Create ${itemNameTitle}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
