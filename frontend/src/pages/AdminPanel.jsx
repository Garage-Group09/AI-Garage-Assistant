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
  AlertCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';

// Maps a backend UserAdminDto → the UI row shape used by this component
const toUiUser = (dto) => ({
  id:     dto.userId,
  name:   dto.name,
  email:  dto.email,
  role:   dto.isAdmin ? 'Administrator' : 'Customer',
  status: 'Active'   // status is not stored in the backend yet; default to Active
});

/** Maps a Garage API response to the UI row shape used by AdminPanel. */
const toUiGarage = (g) => ({
  id:       g.garageId,
  name:     g.garageName    ?? '',
  location: g.location      ?? '',
  phone:    g.phoneNo       ?? '',
  rating:   g.rating != null ? String(g.rating) : ''
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
  const { showToast, user } = useApp();

  // Admin user ID header value, derived from the logged-in user's session
  const adminId = user?.userId ? String(user.userId) : '';

  // Navigation Tab State: 'users' | 'garages' | 'brands'
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
    fetch('http://localhost:8080/api/admin/users', {
      headers: { 'X-Admin-User-Id': adminId }
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
    fetch('http://localhost:8080/api/admin/garages', {
      headers: { 'X-Admin-User-Id': adminId }
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
      fetch('http://localhost:8080/api/admin/brands', { headers: { 'X-Admin-User-Id': adminId } }).then((r) => r.json()),
      fetch('http://localhost:8080/api/admin/models',  { headers: { 'X-Admin-User-Id': adminId } }).then((r) => r.json())
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
  const [garageFormData, setGarageFormData] = useState({ name: '', location: '', phone: '', rating: '4.5' });
  const [brandFormData, setBrandFormData] = useState({ brand: '', modelsText: '' });

  // Delete Confirmation Modal
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, type: '', id: null, name: '' });

  // ================= Open Modal Handlers =================
  const handleOpenAdd = () => {
    setModalMode('add');
    setEditingItem(null);
    if (activeTab === 'users') {
      setUserFormData({ name: '', email: '', role: 'Customer', status: 'Active' });
    } else if (activeTab === 'garages') {
      setGarageFormData({ name: '', location: '', phone: '', rating: '4.5' });
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
      setGarageFormData({ name: item.name, location: item.location, phone: item.phone, rating: item.rating });
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
        fetch(`http://localhost:8080/api/admin/users/${editingItem.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-User-Id': adminId
          },
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
      if (modalMode === 'add') {
        // POST /api/admin/garages
        fetch('http://localhost:8080/api/admin/garages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Admin-User-Id': adminId },
          body: JSON.stringify({
            garageName: garageFormData.name.trim(),
            location:   garageFormData.location.trim(),
            phoneNo:    garageFormData.phone.trim() || null,
            rating:     garageFormData.rating ? Number(garageFormData.rating) : null
          })
        })
          .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
          .then((saved) => {
            setGarages((prev) => [toUiGarage(saved), ...prev]);
            showToast?.(`Garage "${saved.garageName}" added successfully!`);
          })
          .catch((err) => { console.error('Failed to add garage:', err); showToast?.('Failed to add garage.'); });
      } else {
        // PUT /api/admin/garages/{id}
        fetch(`http://localhost:8080/api/admin/garages/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-Admin-User-Id': adminId },
          body: JSON.stringify({
            garageName: garageFormData.name.trim(),
            location:   garageFormData.location.trim(),
            phoneNo:    garageFormData.phone.trim() || null,
            rating:     garageFormData.rating ? Number(garageFormData.rating) : null
          })
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
        fetch('http://localhost:8080/api/admin/brands', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Admin-User-Id': adminId },
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
              const mRes = await fetch('http://localhost:8080/api/admin/models', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Admin-User-Id': adminId },
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
        // Edit remains local-only (no brand/model PUT endpoints yet)
        setBrands(
          brands.map((b) =>
            b.id === editingItem.id
              ? {
                  ...b,
                  brand: brandFormData.brand.trim(),
                  models: modelList.length ? modelList : b.models
                }
              : b
          )
        );
        showToast?.(`Brand "${brandFormData.brand}" updated!`);
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
      fetch(`http://localhost:8080/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'X-Admin-User-Id': adminId }
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
      fetch(`http://localhost:8080/api/admin/garages/${id}`, {
        method: 'DELETE',
        headers: { 'X-Admin-User-Id': adminId }
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          setGarages((prev) => prev.filter((g) => g.id !== id));
          showToast?.(`Garage "${name}" removed.`);
        })
        .catch((err) => { console.error('Failed to delete garage:', err); showToast?.('Failed to delete garage.'); });
    } else if (type === 'brands') {
      setBrands(brands.filter((b) => b.id !== id));
      showToast?.(`Brand "${name}" removed.`);
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
    <div className="container" style={{ padding: '2.5rem 1.5rem', maxWidth: '1240px' }}>
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
        <div>
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
            <Shield size={14} /> Administration Console
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
            AI Garage Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.96rem', marginTop: '0.2rem' }}>
            Manage registered users, service garages, and vehicle brand catalog
          </p>
        </div>

        {/* Global Summary Statistics */}
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
          <div
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
        className="card"
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
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
            <Users size={17} />
            <span>Users</span>
            <span
              style={{
                backgroundColor: activeTab === 'users' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                color: activeTab === 'users' ? 'white' : 'var(--text-main)',
                fontSize: '0.75rem',
                padding: '0.15rem 0.55rem',
                borderRadius: '999px',
                fontWeight: 700
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
            <Building2 size={17} />
            <span>Garages</span>
            <span
              style={{
                backgroundColor: activeTab === 'garages' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                color: activeTab === 'garages' ? 'white' : 'var(--text-main)',
                fontSize: '0.75rem',
                padding: '0.15rem 0.55rem',
                borderRadius: '999px',
                fontWeight: 700
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
            <Car size={17} />
            <span>Brand/Model Management</span>
            <span
              style={{
                backgroundColor: activeTab === 'brands' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                color: activeTab === 'brands' ? 'white' : 'var(--text-main)',
                fontSize: '0.75rem',
                padding: '0.15rem 0.55rem',
                borderRadius: '999px',
                fontWeight: 700
              }}
            >
              {brands.length}
            </span>
          </button>
        </div>

        {/* Right Search and Add Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '220px' }}>
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
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
          >
            <Plus size={16} />
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
                <th style={{ width: '150px', textAlign: 'center' }}>Actions</th>
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

      {/* ================= ADD / EDIT MODAL ================= */}
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
            className="card"
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
            className="card"
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
    </div>
  );
};

export default AdminPanel;
