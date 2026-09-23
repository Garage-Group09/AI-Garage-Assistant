import React, { useState, useEffect } from 'react';
import { Car, PlusCircle, Trash2, Fuel, Shield, Layers, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const VehiclePage = () => {
  const { vehicles, addVehicle, removeVehicle } = useApp();

  // ── Form field state ───────────────────────────────────────────────────────
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('');
  const [year, setYear]                       = useState('');
  const [fuelType, setFuelType]               = useState('Petrol');
  const [vehicleType, setVehicleType]         = useState('Sedan');

  // ── API-driven brand / model lists ────────────────────────────────────────
  const [brands, setBrands]           = useState([]);   // [{ brandId, brandName }]
  const [models, setModels]           = useState([]);   // [{ modelId, brandId, modelName }]
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);

  // Fetch all brands once on mount
  useEffect(() => {
    setBrandsLoading(true);
    fetch('http://localhost:8080/api/brands')
      .then((res) => res.ok ? res.json() : Promise.reject(res.status))
      .then(setBrands)
      .catch((err) => console.error('Failed to fetch brands:', err))
      .finally(() => setBrandsLoading(false));
  }, []);

  // Fetch models whenever the selected brand changes
  useEffect(() => {
    if (!selectedBrandId) { setModels([]); return; }
    setSelectedModelId('');
    setModelsLoading(true);
    fetch(`http://localhost:8080/api/models/${selectedBrandId}`)
      .then((res) => res.ok ? res.json() : Promise.reject(res.status))
      .then(setModels)
      .catch((err) => console.error('Failed to fetch models:', err))
      .finally(() => setModelsLoading(false));
  }, [selectedBrandId]);

  const resetForm = () => {
    setSelectedBrandId('');
    setSelectedModelId('');
    setYear('');
    setFuelType('Petrol');
    setVehicleType('Sedan');
    setModels([]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedBrandId || !selectedModelId) return;

    // Derive the brand name string for the legacy Brand column
    const brandObj = brands.find((b) => b.brandId === Number(selectedBrandId));
    const brandName = brandObj ? brandObj.brandName : '';

    addVehicle({
      brand:   brandName,
      modelId: Number(selectedModelId),
      year:    year ? Number(year) : null,
      fuelType,
      vehicleType
    });

    resetForm();
  };

  const getFuelBadgeClass = (fuel) => {
    switch (fuel) {
      case 'Petrol': return 'badge-orange';
      case 'Diesel': return 'badge-blue';
      case 'Hybrid': return 'badge-green';
      case 'Electric': return 'badge-purple';
      default: return 'badge-blue';
    }
  };

  return (
    <div className="container">
      {/* Page Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.4rem' }}>
          <div style={{ padding: '0.5rem', background: 'var(--primary-blue-light)', borderRadius: '10px', color: 'var(--primary-blue)', flexShrink: 0 }}>
            <Car size={26} />
          </div>
          <h1 className="vehicle-page-title" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-blue)' }}>
            Vehicle Information
          </h1>
        </div>
        <p className="vehicle-page-desc" style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginLeft: '3.2rem' }}>
          Add and manage your vehicles to receive tailored AI diagnostics and maintenance tips.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2.5rem' }}>
        {/* Form Card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <PlusCircle size={22} color="var(--accent-orange)" />
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Add New Vehicle</h2>
          </div>

          <form onSubmit={handleSubmit} className="vehicle-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.2rem', alignItems: 'end' }}>
            {/* Brand Dropdown — populated from GET /api/brands */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="vehicle-brand">
                Vehicle Brand
              </label>
              <select
                id="vehicle-brand"
                className="form-select"
                value={selectedBrandId}
                onChange={(e) => setSelectedBrandId(e.target.value)}
                required
                disabled={brandsLoading}
              >
                <option value="" disabled>
                  {brandsLoading ? 'Loading brands…' : 'Select Brand'}
                </option>
                {brands.map((b) => (
                  <option key={b.brandId} value={b.brandId}>{b.brandName}</option>
                ))}
              </select>
            </div>

            {/* Model Dropdown — populated from GET /api/models/{brandId} */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="vehicle-model">
                Vehicle Model
              </label>
              <select
                id="vehicle-model"
                className="form-select"
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                required
                disabled={!selectedBrandId || modelsLoading}
              >
                <option value="" disabled>
                  {!selectedBrandId ? 'Select a brand first' : modelsLoading ? 'Loading models…' : 'Select Model'}
                </option>
                {models.map((m) => (
                  <option key={m.modelId} value={m.modelId}>{m.modelName}</option>
                ))}
              </select>
            </div>

            {/* Year Input */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="vehicle-year">
                Year of Manufacture
              </label>
              <input
                id="vehicle-year"
                type="number"
                className="form-input"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g. 2019"
                min="1980"
                max={new Date().getFullYear()}
              />
            </div>

            {/* Fuel Type Dropdown */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="fuel-type">
                Fuel Type
              </label>
              <select
                id="fuel-type"
                className="form-select"
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value)}
              >
                <option value="Petrol">Petrol</option>
                <option value="Diesel">Diesel</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Electric">Electric</option>
              </select>
            </div>

            {/* Vehicle Type Dropdown */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="vehicle-type">
                Vehicle Category / Type
              </label>
              <select
                id="vehicle-type"
                className="form-select"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
              >
                <option value="Sedan">Sedan</option>
                <option value="SUV">SUV</option>
                <option value="Hatchback">Hatchback</option>
                <option value="Van">Van / MPV</option>
                <option value="Bike">Motorbike / Scooter</option>
                <option value="Lorry">Lorry / Commercial</option>
              </select>
            </div>

            {/* Add Vehicle Button */}
            <div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', height: '46px', fontSize: '1rem' }}
              >
                <PlusCircle size={20} />
                <span>Add Vehicle</span>
              </button>
            </div>
          </form>
        </div>

        {/* Vehicles Table Card */}
        <div className="card">
          <div className="vehicle-table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--primary-blue)' }}>
              Registered Vehicles ({vehicles.length})
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Alternating row highlights enabled
            </span>
          </div>

          {vehicles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <Car size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
              <p>No vehicles added yet. Use the form above to add your first vehicle.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>#</th>
                    <th>Vehicle Brand & Model</th>
                    <th>Fuel Type</th>
                    <th>Vehicle Type</th>
                    <th style={{ textAlign: 'center', width: '100px', whiteSpace: 'nowrap' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v, idx) => (
                    <tr key={v.id}>
                      <td style={{ fontWeight: 700, color: 'var(--primary-blue)' }}>
                        {idx + 1}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {v.brand}
                      </td>
                      <td>
                        <span className={`badge ${getFuelBadgeClass(v.fuelType)}`}>
                          {v.fuelType}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500 }}>{v.vehicleType}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => removeVehicle(v.id)}
                          style={{
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: 'none',
                            padding: '0.4rem 0.7rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'var(--transition-fast)'
                          }}
                          title="Remove vehicle"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
