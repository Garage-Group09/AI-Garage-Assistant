import MlModelPanel from '../components/MlModelPanel';
import React, { useState, useEffect } from 'react';
import {
  Users,
  Building2,
  Car,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Check,
  Shield,
  Filter,
  CheckCircle,
  AlertCircle,
  Eye,
  Activity,
  FileText,
  CheckCircle2,
  Info,
  Compass
} from 'lucide-react';
import { useApp } from '../context/AppContext';

// Maps a backend UserAdminDto → the UI row shape used by this component
const toUiUser = (dto) => ({
  id:     dto.userId,
  name:   dto.name,
  email:  dto.email,
  role:   (dto.isAdmin === true || dto.admin === true) ? 'Administrator' : 'Customer',
  status: 'Active'   // status is not stored in the backend yet; default to Active
});

/** Maps a Garage API response to the UI row shape used by AdminPanel. */
const toUiGarage = (g) => ({
  id:        g.garageId,
  name:      g.garageName    ?? '',
  location:  g.location      ?? '',
  phone:     g.phoneNo       ?? '',
  rating:    g.rating != null ? String(g.rating) : '',
  latitude:  g.latitude != null ? String(g.latitude) : '',
  longitude: g.longitude != null ? String(g.longitude) : ''
});

/**
 * Merges a flat brands array and a flat models array (both from the API)
 * into the UI row shape: { id, brand, models: [string] }
 */
const toBrandUiList = (apiBrands, apiModels) =>
  apiBrands.map((b) => ({
    id:     b.brandId,
    brand:  b.brandName,
    models: apiModels
      .filter((m) => m.brandId === b.brandId)
      .map((m) => m.modelName)
  }));

export const AdminPanel = () => {
  const { showToast, user, getAuthHeaders } = useApp();

  // Auth headers — uses session token from context (no legacy X-Admin-User-Id needed)
  const authHeaders = getAuthHeaders ? getAuthHeaders() : { 'Content-Type': 'application/json' };
  const adminId = user?.userId ? String(user.userId) : ''; // kept for guard checks only

  // Navigation Tab State: 'users' | 'garages' | 'brands' | 'ml'
  const [activeTab, setActiveTab] = useState('users');
  const [searchQuery, setSearchQuery] = useState('');

  // Local CRUD state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [garages, setGarages] = useState([]);
  const [garagesLoading, setGaragesLoading] = useState(false);
  const [brands, setBrands] = useState([]);
  const [brandsLoading, setBrandsLoading] = useState(false);

  // ── Fetch users from backend on mount ──────────────────────────────────────
  useEffect(() => {
    if (!adminId) return;
    setUsersLoading(true);
    fetch('/api/admin/users', {
      headers: authHeaders
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setUsers(data.map(toUiUser)))
      .catch((err) => {
        console.error('Failed to load users:', err);
        showToast?.('Could not load users from server.');
      })
      .finally(() => setUsersLoading(false));
  }, [adminId]); // re-run if the logged-in admin changes

  // ── Fetch garages from backend on mount ───────────────────────────────────
  useEffect(() => {
    if (!adminId) return;
    setGaragesLoading(true);
    fetch('/api/admin/garages', {
      headers: authHeaders
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setGarages(data.map(toUiGarage)))
      .catch((err) => {
        console.error('Failed to load garages:', err);
        showToast?.('Could not load garages from server.');
      })
      .finally(() => setGaragesLoading(false));
  }, [adminId]);

  // ── Fetch brands + models from backend on mount ─────────────────────────────
  useEffect(() => {
    if (!adminId) return;
    setBrandsLoading(true);
    Promise.all([
      fetch('/api/admin/brands', { headers: authHeaders }).then((r) => r.json()),
      fetch('/api/admin/models',  { headers: authHeaders }).then((r) => r.json())
    ])
      .then(([apiBrands, apiModels]) => setBrands(toBrandUiList(apiBrands, apiModels)))
      .catch((err) => {
        console.error('Failed to load brands/models:', err);
        showToast?.('Could not load brand catalogue from server.');
      })
      .finally(() => setBrandsLoading(false));
  }, [adminId]);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [editingItem, setEditingItem] = useState(null);

  // Form states for modals
  const [userFormData, setUserFormData] = useState({ name: '', email: '', role: 'Customer', status: 'Active' });
  const [garageFormData, setGarageFormData] = useState({ name: '', location: '', phone: '', rating: '4.5', latitude: '', longitude: '' });
  const [brandFormData, setBrandFormData] = useState({ brand: '', modelsText: '' });

  // Delete Confirmation Modal
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, type: '', id: null, name: '' });

  // User Inspection Modal State (GET /api/admin/users/{id}/details)
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectDetails, setInspectDetails] = useState(null);
  const [inspectUser, setInspectUser] = useState(null);
  const [inspectTab, setInspectTab] = useState('vehicles'); // 'vehicles' | 'symptoms' | 'diagnoses' | 'recommendations'

  const handleInspectUser = async (u) => {
    setInspectUser(u);
    setInspectModalOpen(true);
    setInspectLoading(true);
    setInspectDetails(null);
    setInspectTab('vehicles');
    try {
      const res = await fetch(`/api/admin/users/${u.id}/details`, {
        headers: authHeaders
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setInspectDetails(data);
    } catch (err) {
      console.error('Failed to load user details:', err);
      showToast?.('Could not load user inspection details.');
    } finally {
      setInspectLoading(false);
    }
  };

  // ================= Open Modal Handlers =================
  const handleOpenAdd = () => {
    setModalMode('add');
    setEditingItem(null);
    if (activeTab === 'users') {
      setUserFormData({ name: '', email: '', role: 'Customer', status: 'Active' });
    } else if (activeTab === 'garages') {
      setGarageFormData({ name: '', location: '', phone: '', rating: '4.5', latitude: '', longitude: '' });
    } else {
      setBrandFormData({ brand: '', modelsText: '' });
    }
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setModalMode('edit');
    setEditingItem(item);
    if (activeTab === 'users') {
      setUserFormData({ name: item.name, email: item.email, role: item.role, status: item.status });
    } else if (activeTab === 'garages') {
      setGarageFormData({
        name: item.name,
        location: item.location,
        phone: item.phone,
        rating: item.rating,
        latitude: item.latitude ?? '',
        longitude: item.longitude ?? ''
      });
    } else {
      setBrandFormData({ brand: item.brand, modelsText: item.models.join(', ') });
    }
    setModalOpen(true);
  };

  // ================= Save CRUD Handler =================
  const handleSave = (e) => {
    e.preventDefault();

    if (activeTab === 'users') {
      if (!userFormData.name.trim() || !userFormData.email.trim()) return;
      if (modalMode === 'add') {
        const newUser = {
          id: users.length ? Math.max(...users.map((u) => u.id)) + 1 : 1,
          name: userFormData.name.trim(),
          email: userFormData.email.trim(),
          role: userFormData.role,
          status: userFormData.status
        };
        setUsers([newUser, ...users]);
        showToast?.(`User "${newUser.name}" added successfully!`);
      } else {
        // PUT /api/admin/users/{id} — persist the change server-side
        const isAdminFlag = userFormData.role === 'Administrator';
        fetch(`/api/admin/users/${editingItem.id}`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify({
            name:    userFormData.name.trim(),
            email:   userFormData.email.trim(),
            isAdmin: isAdminFlag
          })
        })
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          })
          .then((updated) => {
            setUsers((prev) =>
              prev.map((u) => (u.id === editingItem.id ? { ...toUiUser(updated), status: userFormData.status } : u))
            );
            showToast?.(`User "${updated.name}" updated!`);
          })
          .catch((err) => {
            console.error('Failed to update user:', err);
            showToast?.('Failed to save changes. Please try again.');
          });
      }
    } else if (activeTab === 'garages') {
      if (!garageFormData.name.trim() || !garageFormData.location.trim()) return;
      const latVal = garageFormData.latitude !== '' ? Number(garageFormData.latitude) : null;
      const lngVal = garageFormData.longitude !== '' ? Number(garageFormData.longitude) : null;
      if (latVal != null && (isNaN(latVal) || latVal < -90 || latVal > 90)) {
        showToast?.('Latitude must be a valid number between -90 and 90.');
        return;
      }
      if (lngVal != null && (isNaN(lngVal) || lngVal < -180 || lngVal > 180)) {
        showToast?.('Longitude must be a valid number between -180 and 180.');
        return;
      }
      const garagePayload = {
        garageName: garageFormData.name.trim(),
        location:   garageFormData.location.trim(),
        phoneNo:    garageFormData.phone.trim() || null,
        rating:     garageFormData.rating ? Number(garageFormData.rating) : null,
        latitude:   latVal,
        longitude:  lngVal
      };

      if (modalMode === 'add') {
        // POST /api/admin/garages
        fetch('/api/admin/garages', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(garagePayload)
        })
          .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
          .then((saved) => {
            setGarages((prev) => [toUiGarage(saved), ...prev]);
            showToast?.(`Garage "${saved.garageName}" added successfully!`);
          })
          .catch((err) => { console.error('Failed to add garage:', err); showToast?.('Failed to add garage.'); });
      } else {
        // PUT /api/admin/garages/{id}
        fetch(`/api/admin/garages/${editingItem.id}`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify(garagePayload)
        })
          .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
          .then((updated) => {
            setGarages((prev) => prev.map((g) => g.id === editingItem.id ? toUiGarage(updated) : g));
            showToast?.(`Garage "${updated.garageName}" updated!`);
          })
          .catch((err) => { console.error('Failed to update garage:', err); showToast?.('Failed to save changes.'); });
      }
    } else {
      if (!brandFormData.brand.trim()) return;
      const modelList = brandFormData.modelsText
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean);

      if (modalMode === 'add') {
        // POST /api/admin/brands first, then POST each model individually
        fetch('/api/admin/brands', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ brandName: brandFormData.brand.trim() })
        })
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json(); // { brandId, brandName }
          })
          .then(async (savedBrand) => {
            // POST each model name sequentially
            const savedModelNames = [];
            for (const modelName of modelList) {
              const mRes = await fetch('/api/admin/models', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ brandId: savedBrand.brandId, modelName })
              });
              if (mRes.ok) savedModelNames.push(modelName);
            }
            // Add the merged row to local state
            setBrands((prev) => [
              { id: savedBrand.brandId, brand: savedBrand.brandName, models: savedModelNames },
              ...prev
            ]);
            showToast?.(`Brand "${savedBrand.brandName}" added with ${savedModelNames.length} models!`);
          })
          .catch((err) => {
            console.error('Failed to add brand:', err);
            showToast?.('Failed to add brand. Please try again.');
          });
      } else {
        // PUT /api/admin/brands/{id} — persist brand and model changes to the server
        fetch(`/api/admin/brands/${editingItem.id}`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify({
            brandName: brandFormData.brand.trim(),
            models: modelList
          })
        })
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          })
          .then(() => {
            setBrands((prev) =>
              prev.map((b) =>
                b.id === editingItem.id
                  ? {
                      ...b,
                      brand: brandFormData.brand.trim(),
                      models: modelList
                    }
                  : b
              )
            );
            showToast?.(`Brand "${brandFormData.brand}" updated with ${modelList.length} models!`);
          })
          .catch((err) => {
            console.error('Failed to update brand:', err);
            showToast?.('Failed to update brand on server.');
          });
      }
    }

    setModalOpen(false);
  };

  // ================= Delete Handlers =================
  const promptDelete = (type, item) => {
    setDeleteConfirm({
      open: true,
      type,
      id: item.id,
      name: item.name || item.brand
    });
  };

  const confirmDeleteAction = () => {
    const { type, id, name } = deleteConfirm;
    if (type === 'users') {
      // DELETE /api/admin/users/{id} — remove from the database first
      fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: authHeaders
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          setUsers((prev) => prev.filter((u) => u.id !== id));
          showToast?.(`User "${name}" deleted.`);
        })
        .catch((err) => {
          console.error('Failed to delete user:', err);
          showToast?.('Failed to delete user. Please try again.');
        });
    } else if (type === 'garages') {
      // DELETE /api/admin/garages/{id}
      fetch(`/api/admin/garages/${id}`, {
        method: 'DELETE',
        headers: authHeaders
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          setGarages((prev) => prev.filter((g) => g.id !== id));
          showToast?.(`Garage "${name}" removed.`);
        })
        .catch((err) => { console.error('Failed to delete garage:', err); showToast?.('Failed to delete garage.'); });
    } else if (type === 'brands') {
      // DELETE /api/admin/brands/{id}
      fetch(`/api/admin/brands/${id}`, {
        method: 'DELETE',
        headers: authHeaders
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          setBrands((prev) => prev.filter((b) => b.id !== id));
          showToast?.(`Brand "${name}" removed.`);
        })
        .catch((err) => {
          console.error('Failed to delete brand:', err);
          showToast?.('Cannot delete brand: linked to registered vehicles.');
        });
    }
    setDeleteConfirm({ open: false, type: '', id: null, name: '' });
  };

  // Filtered queries
  const q = searchQuery.toLowerCase().trim();
  const filteredUsers = users.filter(
    (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || String(u.id).includes(q)
  );
  const filteredGarages = garages.filter(
    (g) => g.name.toLowerCase().includes(q) || g.location.toLowerCase().includes(q) || String(g.id).includes(q)
  );
  const filteredBrands = brands.filter(
    (b) =>
      b.brand.toLowerCase().includes(q) ||
      b.models.some((m) => m.toLowerCase().includes(q)) ||
      String(b.id).includes(q)
  );

  return (
    <div className="container admin-container" style={{ padding: '2.5rem 1.5rem', maxWidth: '1240px' }}>
      {/* Top Banner Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1.2rem',
          marginBottom: '2rem'
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#eff6ff',
              color: 'var(--primary-blue-mid)',
              padding: '0.3rem 0.8rem',
              borderRadius: '999px',
              fontSize: '0.82rem',
              fontWeight: 700,
              marginBottom: '0.6rem'
            }}
          >
            <Shield size={14} style={{ flexShrink: 0 }} /> Administration Console
          </div>
          <h1 className="admin-page-title" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
            AI Garage Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.96rem', marginTop: '0.2rem' }}>
            Manage registered users, service garages, and vehicle brand catalog
          </p>
        </div>

        {/* Global Summary Statistics */}
        <div className="admin-stats-row" style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
          <div
            className="admin-stat-card"
            style={{
              background: 'white',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1.25rem',
              boxShadow: 'var(--shadow-sm)',
              textAlign: 'center',
              minWidth: '100px'
            }}
          >
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-blue-mid)' }}>
              {users.length}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Users</div>
          </div>
          <div
            className="admin-stat-card"
            style={{
              background: 'white',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1.25rem',
              boxShadow: 'var(--shadow-sm)',
              textAlign: 'center',
              minWidth: '100px'
            }}
          >
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-orange)' }}>
              {garages.length}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Garages</div>
          </div>
          <div
            className="admin-stat-card"
            style={{
              background: 'white',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1.25rem',
              boxShadow: 'var(--shadow-sm)',
              textAlign: 'center',
              minWidth: '100px'
            }}
          >
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16a34a' }}>
              {brands.length}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Brands</div>
          </div>
        </div>
      </div>

      {/* Tabs Bar & Controls */}
      <div
        className="card admin-controls-card"
        style={{
          padding: '1.2rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        {/* Navigation Tabs */}
        <div className="admin-tabs-nav" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setActiveTab('users');
              setSearchQuery('');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.2rem',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.92rem',
              transition: 'var(--transition-fast)',
              backgroundColor: activeTab === 'users' ? 'var(--primary-blue)' : '#f1f5f9',
              color: activeTab === 'users' ? 'white' : 'var(--text-secondary)'
            }}
          >
            <Users size={17} style={{ flexShrink: 0 }} />
            <span>Users</span>
            <span
              style={{
                backgroundColor: activeTab === 'users' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                color: activeTab === 'users' ? 'white' : 'var(--text-main)',
                fontSize: '0.75rem',
                padding: '0.15rem 0.55rem',
                borderRadius: '999px',
                fontWeight: 700,
                flexShrink: 0
              }}
            >
              {users.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('garages');
              setSearchQuery('');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.2rem',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.92rem',
              transition: 'var(--transition-fast)',
              backgroundColor: activeTab === 'garages' ? 'var(--primary-blue)' : '#f1f5f9',
              color: activeTab === 'garages' ? 'white' : 'var(--text-secondary)'
            }}
          >
            <Building2 size={17} style={{ flexShrink: 0 }} />
            <span>Garages</span>
            <span
              style={{
                backgroundColor: activeTab === 'garages' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                color: activeTab === 'garages' ? 'white' : 'var(--text-main)',
                fontSize: '0.75rem',
                padding: '0.15rem 0.55rem',
                borderRadius: '999px',
                fontWeight: 700,
                flexShrink: 0
              }}
            >
              {garages.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('brands');
              setSearchQuery('');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.2rem',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.92rem',
              transition: 'var(--transition-fast)',
              backgroundColor: activeTab === 'brands' ? 'var(--primary-blue)' : '#f1f5f9',
              color: activeTab === 'brands' ? 'white' : 'var(--text-secondary)'
            }}
          >
            <Car size={17} style={{ flexShrink: 0 }} />
            <span>Brand/Model Management</span>
            <span
              style={{
                backgroundColor: activeTab === 'brands' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                color: activeTab === 'brands' ? 'white' : 'var(--text-main)',
                fontSize: '0.75rem',
                padding: '0.15rem 0.55rem',
                borderRadius: '999px',
                fontWeight: 700,
                flexShrink: 0
              }}
            >
              {brands.length}
            </span>
          </button>

          {/* ML Model Management Tab */}
          <button
            onClick={() => {
              setActiveTab('ml');
              setSearchQuery('');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.2rem',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.92rem',
              transition: 'var(--transition-fast)',
              backgroundColor: activeTab === 'ml' ? '#7c3aed' : '#f1f5f9',
              color: activeTab === 'ml' ? 'white' : 'var(--text-secondary)'
            }}
          >
            <Activity size={17} style={{ flexShrink: 0 }} />
            <span>ML Model</span>
            <span
              style={{
                backgroundColor: activeTab === 'ml' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                color: activeTab === 'ml' ? 'white' : 'var(--text-main)',
                fontSize: '0.75rem',
                padding: '0.15rem 0.55rem',
                borderRadius: '999px',
                fontWeight: 700,
                flexShrink: 0
              }}
            >
              Review
            </span>
          </button>
        </div>

        {/* Right Search and Add Actions */}
        <div className="admin-controls-right" style={{ display: activeTab === 'ml' ? 'none' : 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
          <div className="admin-search-wrapper" style={{ position: 'relative', width: '220px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }}
            />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{
                paddingLeft: '2.2rem',
                paddingTop: '0.45rem',
                paddingBottom: '0.45rem',
                fontSize: '0.88rem'
              }}
            />
          </div>

          <button
            onClick={handleOpenAdd}
            className="btn btn-primary btn-sm admin-add-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            <Plus size={16} style={{ flexShrink: 0 }} />
            <span>
              {activeTab === 'users' ? 'Add User' : activeTab === 'garages' ? 'Add Garage' : 'Add Brand'}
            </span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: USERS SECTION ================= */}
      {activeTab === 'users' && (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>User ID</th>
                <th>Name</th>
                <th>Email Address</th>
                <th style={{ width: '140px' }}>Role</th>
                <th style={{ width: '120px' }}>Status</th>
                <th style={{ width: '240px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {usersLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    Loading users…
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td style={{ fontWeight: 700, color: 'var(--primary-blue-mid)' }}>#{user.id}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`badge ${user.role === 'Administrator' ? 'badge-purple' : 'badge-blue'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${user.status === 'Active' ? 'badge-green' : 'badge-orange'}`}>
                        {user.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
                        <button
                          onClick={() => handleInspectUser(user)}
                          title="Inspect User Records & History"
                          style={{
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            color: '#16a34a',
                            padding: '0.35rem 0.65rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.8rem',
                            fontWeight: 600
                          }}
                        >
                          <Eye size={13} /> Inspect
                        </button>
                        <button
                          onClick={() => handleOpenEdit(user)}
                          title="Edit User"
                          style={{
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#2563eb',
                            padding: '0.35rem 0.65rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.8rem',
                            fontWeight: 600
                          }}
                        >
                          <Pencil size={13} /> Edit
                        </button>
                        <button
                          onClick={() => promptDelete('users', user)}
                          title="Delete User"
                          style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            color: '#dc2626',
                            padding: '0.35rem 0.65rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.8rem',
                            fontWeight: 600
                          }}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= TAB 2: GARAGES SECTION ================= */}
      {activeTab === 'garages' && (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Garage ID</th>
                <th>Garage Name</th>
                <th>Location</th>
                <th>Phone No</th>
                <th style={{ width: '110px' }}>Rating</th>
                <th style={{ width: '150px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {garagesLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    Loading garages…
                  </td>
                </tr>
              ) : filteredGarages.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    No garages found matching your search.
                  </td>
                </tr>
              ) : (
                filteredGarages.map((garage) => (
                  <tr key={garage.id}>
                    <td style={{ fontWeight: 700, color: 'var(--primary-blue-mid)' }}>#{garage.id}</td>
                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{garage.name}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        {garage.location}
                      </span>
                    </td>
                    <td>{garage.phone}</td>
                    <td>
                      <span
                        style={{
                          backgroundColor: '#fef3c7',
                          color: '#b45309',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.82rem'
                        }}
                      >
                        ⭐ {garage.rating}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
                        <button
                          onClick={() => handleOpenEdit(garage)}
                          title="Edit Garage"
                          style={{
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#2563eb',
                            padding: '0.35rem 0.65rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.8rem',
                            fontWeight: 600
                          }}
                        >
                          <Pencil size={13} /> Edit
                        </button>
                        <button
                          onClick={() => promptDelete('garages', garage)}
                          title="Delete Garage"
                          style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            color: '#dc2626',
                            padding: '0.35rem 0.65rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.8rem',
                            fontWeight: 600
                          }}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= TAB 3: BRAND / MODEL MANAGEMENT SECTION ================= */}
      {activeTab === 'brands' && (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Brand ID</th>
                <th style={{ width: '160px' }}>Brand Name</th>
                <th>Supported Vehicle Models</th>
                <th style={{ width: '130px' }}>Total Models</th>
                <th style={{ width: '150px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {brandsLoading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    Loading brands…
                  </td>
                </tr>
              ) : filteredBrands.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    No vehicle brands found matching your search.
                  </td>
                </tr>
              ) : (
                filteredBrands.map((b) => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 700, color: 'var(--primary-blue-mid)' }}>#{b.id}</td>
                    <td style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1rem' }}>{b.brand}</td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {b.models.map((model, idx) => (
                          <span
                            key={idx}
                            style={{
                              background: '#f1f5f9',
                              border: '1px solid #e2e8f0',
                              color: 'var(--text-secondary)',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 600
                            }}
                          >
                            {model}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-orange">{b.models.length} Models</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
                        <button
                          onClick={() => handleOpenEdit(b)}
                          title="Edit Brand"
                          style={{
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#2563eb',
                            padding: '0.35rem 0.65rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.8rem',
                            fontWeight: 600
                          }}
                        >
                          <Pencil size={13} /> Edit
                        </button>
                        <button
                          onClick={() => promptDelete('brands', b)}
                          title="Delete Brand"
                          style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            color: '#dc2626',
                            padding: '0.35rem 0.65rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.8rem',
                            fontWeight: 600
                          }}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= TAB 4: ML MODEL MANAGEMENT ================= */}
      {activeTab === 'ml' && <MlModelPanel />}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1500,
            padding: '1rem',
            backdropFilter: 'blur(3px)'
          }}
        >
          <div
            className="card admin-modal-card"
            style={{
              width: '100%',
              maxWidth: '500px',
              padding: '2rem',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '0.75rem'
              }}
            >
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {modalMode === 'add' ? 'Add New ' : 'Edit '}
                {activeTab === 'users' ? 'User' : activeTab === 'garages' ? 'Garage' : 'Brand & Models'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '0.2rem'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              {/* Users Form */}
              {activeTab === 'users' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={userFormData.name}
                      onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                      placeholder="e.g. Kasun Perera"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="form-input"
                      value={userFormData.email}
                      onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                      placeholder="e.g. user@example.com"
                      required
                    />
                  </div>
                  <div className="modal-form-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Role</label>
                      <select
                        className="form-select"
                        value={userFormData.role}
                        onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                      >
                        <option value="Customer">Customer</option>
                        <option value="Administrator">Administrator</option>
                        <option value="Technician">Technician</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Status</label>
                      <select
                        className="form-select"
                        value={userFormData.status}
                        onChange={(e) => setUserFormData({ ...userFormData, status: e.target.value })}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Garages Form */}
              {activeTab === 'garages' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Garage Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={garageFormData.name}
                      onChange={(e) => setGarageFormData({ ...garageFormData, name: e.target.value })}
                      placeholder="e.g. Metro Hybrid Care"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Location</label>
                    <input
                      type="text"
                      className="form-input"
                      value={garageFormData.location}
                      onChange={(e) => setGarageFormData({ ...garageFormData, location: e.target.value })}
                      placeholder="e.g. Colombo 04 or Kandy Road"
                      required
                    />
                  </div>
                  <div className="modal-form-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Phone Number</label>
                      <input
                        type="text"
                        className="form-input"
                        value={garageFormData.phone}
                        onChange={(e) => setGarageFormData({ ...garageFormData, phone: e.target.value })}
                        placeholder="+94 11 234 5678"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Rating (1.0 - 5.0)</label>
                      <input
                        type="text"
                        className="form-input"
                        value={garageFormData.rating}
                        onChange={(e) => setGarageFormData({ ...garageFormData, rating: e.target.value })}
                        placeholder="4.7"
                      />
                    </div>
                  </div>
                  <div className="modal-form-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.8rem' }}>
                    <div className="form-group">
                      <label className="form-label">Latitude (-90 to 90)</label>
                      <input
                        type="number"
                        step="any"
                        className="form-input"
                        value={garageFormData.latitude}
                        onChange={(e) => setGarageFormData({ ...garageFormData, latitude: e.target.value })}
                        placeholder="e.g. 6.9271"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Longitude (-180 to 180)</label>
                      <input
                        type="number"
                        step="any"
                        className="form-input"
                        value={garageFormData.longitude}
                        onChange={(e) => setGarageFormData({ ...garageFormData, longitude: e.target.value })}
                        placeholder="e.g. 79.8612"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Brands Form */}
              {activeTab === 'brands' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Brand Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={brandFormData.brand}
                      onChange={(e) => setBrandFormData({ ...brandFormData, brand: e.target.value })}
                      placeholder="e.g. Toyota or BMW"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vehicle Models (comma-separated)</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      value={brandFormData.modelsText}
                      onChange={(e) => setBrandFormData({ ...brandFormData, modelsText: e.target.value })}
                      placeholder="Corolla, Aqua, Vitz, Prius"
                      style={{ resize: 'vertical' }}
                      required
                    />
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', marginTop: '0.3rem' }}>
                      Separate model names with commas (e.g. "Civic, Vezel, Fit")
                    </small>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn btn-outline btn-sm"
                  style={{ padding: '0.55rem 1.2rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  style={{ padding: '0.55rem 1.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Check size={16} />
                  <span>{modalMode === 'add' ? 'Create Record' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= DELETE CONFIRMATION MODAL ================= */}
      {deleteConfirm.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1600,
            padding: '1rem',
            backdropFilter: 'blur(3px)'
          }}
        >
          <div
            className="card admin-delete-modal-card"
            style={{
              width: '100%',
              maxWidth: '420px',
              padding: '1.8rem',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto'
              }}
            >
              <AlertCircle size={28} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
              Confirm Deletion
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '1.5rem' }}>
              Are you sure you want to delete <strong>"{deleteConfirm.name}"</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.8rem' }}>
              <button
                type="button"
                onClick={() => setDeleteConfirm({ open: false, type: '', id: null, name: '' })}
                className="btn btn-outline btn-sm"
                style={{ padding: '0.6rem 1.4rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteAction}
                className="btn btn-sm"
                style={{
                  backgroundColor: '#dc2626',
                  color: 'white',
                  padding: '0.6rem 1.4rem'
                }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= USER DETAILS INSPECTION MODAL ================= */}
      {inspectModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1700,
            padding: '1.2rem',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div
            className="card admin-inspect-modal-card"
            style={{
              width: '100%',
              maxWidth: '900px',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              padding: '1.8rem 2rem',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              background: 'white',
              overflow: 'hidden'
            }}
          >
            {/* Modal Top Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '1rem',
                marginBottom: '1rem'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary-blue)', margin: 0 }}>
                    User Inspection: {inspectUser?.name || 'Account Details'}
                  </h3>
                  <span className={`badge ${inspectUser?.role === 'Administrator' ? 'badge-purple' : 'badge-blue'}`}>
                    {inspectUser?.role}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap', marginTop: '0.4rem', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                  <span><strong>ID:</strong> #{inspectUser?.id}</span>
                  <span><strong>Email:</strong> {inspectUser?.email}</span>
                  {inspectDetails?.user?.contactNo && (
                    <span><strong>Phone:</strong> {inspectDetails.user.contactNo}</span>
                  )}
                  {inspectDetails?.user?.location && (
                    <span><strong>Location:</strong> {inspectDetails.user.location}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setInspectModalOpen(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Inspect Sub-Tabs */}
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '0.6rem',
                marginBottom: '1.2rem',
                overflowX: 'auto'
              }}
            >
              <button
                type="button"
                onClick={() => setInspectTab('vehicles')}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: inspectTab === 'vehicles' ? 'var(--primary-blue)' : '#f1f5f9',
                  color: inspectTab === 'vehicles' ? 'white' : 'var(--text-secondary)'
                }}
              >
                <Car size={15} />
                <span>Vehicles</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>({inspectDetails?.vehicles?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectTab('symptoms')}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: inspectTab === 'symptoms' ? 'var(--primary-blue)' : '#f1f5f9',
                  color: inspectTab === 'symptoms' ? 'white' : 'var(--text-secondary)'
                }}
              >
                <Activity size={15} />
                <span>Symptoms</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>({inspectDetails?.symptoms?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectTab('diagnoses')}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: inspectTab === 'diagnoses' ? 'var(--primary-blue)' : '#f1f5f9',
                  color: inspectTab === 'diagnoses' ? 'white' : 'var(--text-secondary)'
                }}
              >
                <FileText size={15} />
                <span>Diagnoses</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>({inspectDetails?.diagnoses?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectTab('recommendations')}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: inspectTab === 'recommendations' ? 'var(--primary-blue)' : '#f1f5f9',
                  color: inspectTab === 'recommendations' ? 'white' : 'var(--text-secondary)'
                }}
              >
                <Compass size={15} />
                <span>Recommendations</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>({inspectDetails?.recommendations?.length || 0})</span>
              </button>
            </div>

            {/* Scrollable Inspect Content Area */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.4rem' }}>
              {inspectLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  <div className="spin" style={{ width: '24px', height: '24px', border: '3px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 1rem auto' }} />
                  Loading user records...
                </div>
              ) : !inspectDetails ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No details retrieved for this user.
                </div>
              ) : (
                <>
                  {/* TAB: VEHICLES */}
                  {inspectTab === 'vehicles' && (
                    <div>
                      {inspectDetails.vehicles?.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No vehicles registered by this user.</p>
                      ) : (
                        <table className="custom-table" style={{ fontSize: '0.88rem' }}>
                          <thead>
                            <tr>
                              <th style={{ width: '60px' }}>ID</th>
                              <th>Brand & Model</th>
                              <th>Year</th>
                              <th>Fuel Type</th>
                              <th>Category</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inspectDetails.vehicles.map((v) => (
                              <tr key={v.vehicleId}>
                                <td style={{ fontWeight: 700, color: 'var(--primary-blue-mid)' }}>#{v.vehicleId}</td>
                                <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                                  {v.brand} {v.modelName || ''}
                                </td>
                                <td>{v.year || 'N/A'}</td>
                                <td><span className="badge badge-orange">{v.fuelType || 'N/A'}</span></td>
                                <td><span className="badge badge-blue">{v.vehicleType || 'N/A'}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* TAB: SYMPTOMS */}
                  {inspectTab === 'symptoms' && (
                    <div>
                      {inspectDetails.symptoms?.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No symptoms logged by this user.</p>
                      ) : (
                        <table className="custom-table" style={{ fontSize: '0.88rem' }}>
                          <thead>
                            <tr>
                              <th style={{ width: '60px' }}>ID</th>
                              <th>Reported Symptom</th>
                              <th style={{ width: '100px' }}>Vehicle ID</th>
                              <th style={{ width: '160px' }}>Reported At</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inspectDetails.symptoms.map((s) => (
                              <tr key={s.symptomId}>
                                <td style={{ fontWeight: 700, color: 'var(--primary-blue-mid)' }}>#{s.symptomId}</td>
                                <td style={{ wordBreak: 'break-word', color: 'var(--text-main)' }}>{s.description}</td>
                                <td>{s.vehicleId ? `#${s.vehicleId}` : 'None'}</td>
                                <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                  {s.createdAt ? new Date(s.createdAt).toLocaleString() : 'N/A'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* TAB: DIAGNOSES */}
                  {inspectTab === 'diagnoses' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                      {inspectDetails.diagnoses?.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No diagnostic assessments found for this user.</p>
                      ) : (
                        inspectDetails.diagnoses.map((d) => (
                          <div
                            key={d.diagnosisId}
                            style={{
                              border: '1px solid var(--border-color)',
                              borderRadius: '12px',
                              padding: '1rem 1.2rem',
                              background: '#f8fafc',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.4rem',
                              fontSize: '0.88rem'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <span style={{ fontWeight: 800, color: 'var(--primary-blue)', fontSize: '0.95rem' }}>
                                #{d.diagnosisId} • {d.faultName || 'General Assessment'}
                              </span>
                              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                {d.responseType && (
                                  <span className="badge badge-purple" style={{ fontSize: '0.72rem' }}>{d.responseType}</span>
                                )}
                                {d.confidenceLevel != null && (
                                  <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>
                                    {Math.round(d.confidenceLevel * 100)}% Confidence
                                  </span>
                                )}
                                {d.safeToDrive === true ? (
                                  <span className="badge badge-green" style={{ fontSize: '0.72rem' }}>Safe</span>
                                ) : d.safeToDrive === false ? (
                                  <span className="badge badge-red" style={{ fontSize: '0.72rem', background: '#fee2e2', color: '#dc2626' }}>Unsafe</span>
                                ) : null}
                              </div>
                            </div>
                            {d.possibleCause && (
                              <p style={{ margin: '0.3rem 0', color: 'var(--text-main)', lineHeight: 1.5 }}>
                                <strong>Assessment:</strong> {d.possibleCause}
                              </p>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                              <span>Model Used: {d.modelUsed || 'hybrid-naivebayes+groq'}</span>
                              <span>{d.createdAt ? new Date(d.createdAt).toLocaleString() : ''}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TAB: RECOMMENDATIONS */}
                  {inspectTab === 'recommendations' && (
                    <div>
                      {inspectDetails.recommendations?.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No garage recommendations recorded for this user.</p>
                      ) : (
                        <table className="custom-table" style={{ fontSize: '0.88rem' }}>
                          <thead>
                            <tr>
                              <th style={{ width: '60px' }}>ID</th>
                              <th>Garage ID</th>
                              <th>Diagnosis ID</th>
                              <th>Distance (km)</th>
                              <th>Match Score</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inspectDetails.recommendations.map((r) => (
                              <tr key={r.recommendationId}>
                                <td style={{ fontWeight: 700, color: 'var(--primary-blue-mid)' }}>#{r.recommendationId}</td>
                                <td style={{ fontWeight: 600 }}>Garage #{r.garageId}</td>
                                <td>{r.diagnosisId ? `#${r.diagnosisId}` : 'N/A'}</td>
                                <td>{r.distance != null ? `${r.distance.toFixed(1)} km` : 'N/A'}</td>
                                <td>{r.matchScore != null ? r.matchScore.toFixed(2) : 'N/A'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Bottom Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => setInspectModalOpen(false)}
                className="btn btn-outline btn-sm"
                style={{ padding: '0.55rem 1.4rem' }}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
