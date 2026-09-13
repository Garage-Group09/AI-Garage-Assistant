import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Phone, Share2, Star, Clock, Wrench, Search, Navigation, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

// High quality demo garage data for Northern Sri Lanka (Jaffna Region)
const DEMO_GARAGES = [
  {
    id: 1,
    name: 'Ilavenil Automotive Engineering',
    rating: 5.0,
    reviews: 23,
    type: 'Auto repair shop',
    address: 'Jaffna-Kankesanturai Rd',
    phone: '077 292 9662',
    phoneRaw: '0772929662',
    lat: 9.6820,
    lng: 80.0210,
    openStatus: 'Open Now • 8:00 AM - 6:00 PM',
    distance: '1.1 km away',
    services: ['Engine Repair', 'Auto Diagnostics', 'Brake Systems', 'Electrical Work']
  },
  {
    id: 2,
    name: 'JS Motors',
    rating: 5.0,
    reviews: 5,
    type: 'Auto repair shop',
    address: 'M2VW+WV2, Kondavil-Irupalai Rd',
    phone: '077 165 7750',
    phoneRaw: '0771657750',
    lat: 9.6950,
    lng: 80.0350,
    openStatus: 'Open Now • 8:30 AM - 6:30 PM',
    distance: '2.4 km away',
    services: ['Engine Tune-up', 'Oil & Filter Change', 'Wheel Alignment', 'General Maintenance']
  },
  {
    id: 3,
    name: 'Deiva Car Care',
    rating: 4.4,
    reviews: 36,
    type: 'Auto repair shop',
    address: 'Sirampirady Ln, Jaffna',
    phone: '077 791 3930',
    phoneRaw: '0777913930',
    lat: 9.6686882,
    lng: 80.0179374,
    openStatus: 'Open • 9:00 AM - 5:00 PM (Closed Sundays)',
    distance: '2.8 km away',
    services: ['Engine Diagnostics', 'Brake Service', 'Spare Parts', 'General Repair']
  }
];

/**
 * Helper component to re-center Leaflet Map when selected garage changes
 */
const MapRecenter = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13, { animate: true });
  }, [center, map]);
  return null;
};

/**
 * Create SVG Marker Pins for Leaflet Map displaying Orange (Selected) / Deep Blue pins
 */
const createCustomIcon = (isSelected) => {
  return L.divIcon({
    className: 'custom-map-pin-div',
    html: `
      <div style="
        background: ${isSelected ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'linear-gradient(135deg, #1e3a8a, #2563eb)'};
        width: 38px;
        height: 38px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 4px 14px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        cursor: pointer;
        transition: transform 0.2s ease;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -38]
  });
};

/**
 * Modern Garage Finder Page Component
 * Simple, modular, and beginner-friendly React implementation matching Design System:
 * - Colors: Deep Blue (#1e3a8a), Mid Blue (#2563eb), Clean Background (#f8fafc), Orange Highlights (#f97316 → #ea580c)
 * - Rounded cards (borderRadius: 20px)
 * - Interactive Leaflet.js map on left, attractive garage cards on right
 * - Phone click-to-call link, Share button, Rating stars, and Address details
 */
export const GarageFinderPage = () => {
  const { showToast } = useApp();
  const [garages] = useState(DEMO_GARAGES);
  const [selectedGarage, setSelectedGarage] = useState(DEMO_GARAGES[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  // Filter garages by search query (name, address, type, or service)
  const filteredGarages = garages.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.services.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // GPS Location detector using HTML5 Geolocation API
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      showToast?.('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    showToast?.('Detecting your GPS coordinates...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        showToast?.(`GPS Locked: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
      },
      () => {
        setIsLocating(false);
        showToast?.('Using default region map view.');
      },
      { timeout: 8000 }
    );
  };

  // Share Garage Details handler (Web Share API with Clipboard Fallback)
  const handleShareGarage = (garage, e) => {
    e?.stopPropagation();
    const shareText = `Garage: ${garage.name}\nType: ${garage.type}\nRating: ${garage.rating}⭐ (${garage.reviews} reviews)\nAddress: ${garage.address}\nPhone: ${garage.phone}\nLocation: https://maps.google.com/?q=${garage.lat},${garage.lng}`;

    if (navigator.share) {
      navigator.share({
        title: garage.name,
        text: shareText,
        url: `https://maps.google.com/?q=${garage.lat},${garage.lng}`
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText);
      showToast?.('Garage info copied to clipboard!');
    }
  };

  return (
    <div className="container" style={{ backgroundColor: 'var(--bg-page)' }}>
      
      {/* Page Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
          color: 'white',
          padding: '1.8rem 2rem',
          borderRadius: '20px',
          marginBottom: '2rem',
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <MapPin size={28} color="#f97316" />
            Garage Finder & Auto Workshops
          </h1>
          <p style={{ color: '#cbd5e1', fontSize: '0.98rem', marginTop: '0.3rem' }}>
            Discover top-rated auto repair shops, mechanics & 24/7 breakdown assistance
          </p>
        </div>

        {/* GPS Locate Me Button */}
        <button
          className="btn btn-primary"
          onClick={handleDetectLocation}
          disabled={isLocating}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '12px' }}
        >
          <Navigation size={18} className={isLocating ? 'spin' : ''} />
          <span>{isLocating ? 'Locating...' : 'Locate Me'}</span>
        </button>
      </div>

      {/* Main Grid: Interactive Map on Left, Garage Cards on Right */}
      <div className="garage-finder-grid">
        
        {/* Left Side: Interactive Leaflet.js Map */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          <div
            className="card"
            style={{
              padding: 0,
              overflow: 'hidden',
              height: '520px',
              borderRadius: '20px',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-md)',
              position: 'relative'
            }}
          >
            {/* Interactive Leaflet Map centered on selected garage */}
            <MapContainer
              center={[selectedGarage.lat, selectedGarage.lng]}
              zoom={13}
              scrollWheelZoom={true}
              style={{ width: '100%', height: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapRecenter center={[selectedGarage.lat, selectedGarage.lng]} />

              {garages.map((garage) => {
                const isSelected = selectedGarage.id === garage.id;
                return (
                  <Marker
                    key={garage.id}
                    position={[garage.lat, garage.lng]}
                    icon={createCustomIcon(isSelected)}
                    eventHandlers={{
                      click: () => setSelectedGarage(garage)
                    }}
                  >
                    <Popup>
                      <div style={{ padding: '4px', maxWidth: '210px' }}>
                        <strong style={{ color: '#1e3a8a', fontSize: '0.95rem' }}>{garage.name}</strong>
                        <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>{garage.type}</div>
                        <p style={{ margin: '4px 0', fontSize: '0.8rem', color: '#64748b' }}>📍 {garage.address}</p>
                        <a href={`tel:${garage.phoneRaw}`} style={{ color: '#2563eb', fontWeight: 700, fontSize: '0.8rem', textDecoration: 'none' }}>
                          📞 {garage.phone}
                        </a>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          {/* Active Selected Workshop Card */}
          {selectedGarage && (
            <div
              className="card"
              style={{
                borderRadius: '20px',
                borderLeft: '5px solid #f97316',
                padding: '1.3rem 1.6rem',
                background: 'white',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem' }}>
                <div>
                  <span className="badge badge-orange" style={{ marginBottom: '0.4rem' }}>
                    Selected Workshop
                  </span>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e3a8a' }}>
                    {selectedGarage.name}
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    📍 {selectedGarage.address} • <span style={{ color: '#f97316', fontWeight: 700 }}>{selectedGarage.distance}</span>
                  </p>
                </div>

                <a
                  href={`tel:${selectedGarage.phoneRaw}`}
                  className="btn btn-primary btn-sm"
                  style={{ textDecoration: 'none', gap: '0.4rem', borderRadius: '12px' }}
                >
                  <Phone size={16} /> Call Garage
                </a>
              </div>
            </div>
          )}

        </div>

        {/* Right Side: Demo Garage Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          {/* Search Bar */}
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.6rem', background: 'white', borderRadius: '14px', fontSize: '0.95rem' }}
              placeholder="Search garage by name, address, or service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Available Repair Shops ({filteredGarages.length})</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#2563eb' }}>Verified Partners</span>
          </div>

          {/* Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', overflowY: 'auto', maxHeight: '620px', paddingRight: '4px' }}>
            {filteredGarages.map((garage) => {
              const isSelected = selectedGarage.id === garage.id;

              return (
                <div
                  key={garage.id}
                  className="card card-hover"
                  onClick={() => setSelectedGarage(garage)}
                  style={{
                    padding: '1.4rem',
                    cursor: 'pointer',
                    borderRadius: '20px',
                    borderColor: isSelected ? '#f97316' : 'var(--border-color)',
                    background: isSelected ? '#fff7ed' : '#ffffff',
                    boxShadow: isSelected ? '0 8px 25px rgba(249, 115, 22, 0.15)' : 'var(--shadow-sm)',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  {/* Garage Name & Distance */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.6rem', marginBottom: '0.4rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e3a8a', lineHeight: 1.3 }}>
                        {garage.name}
                      </h3>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        {garage.type}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f97316', background: '#ffedd5', padding: '0.25rem 0.65rem', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                      {garage.distance}
                    </span>
                  </div>

                  {/* Rating Stars & Review Count */}
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem', fontSize: '0.88rem', margin: '0.6rem 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#b45309', fontWeight: 700, background: '#fef3c7', padding: '0.2rem 0.6rem', borderRadius: '8px' }}>
                      <Star size={15} fill="#f59e0b" color="#f59e0b" />
                      <span>{garage.rating.toFixed(1)}</span>
                      <span style={{ fontWeight: 500, color: '#78350f', fontSize: '0.8rem' }}>({garage.reviews} reviews)</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#16a34a', fontWeight: 600, fontSize: '0.8rem' }}>
                      <Clock size={14} />
                      <span>{garage.openStatus}</span>
                    </div>
                  </div>

                  {/* Address & Click-to-Call Phone Number */}
                  <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <MapPin size={15} color="#2563eb" style={{ flexShrink: 0 }} />
                      <span>{garage.address}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Phone size={15} color="#f97316" style={{ flexShrink: 0 }} />
                      <a
                        href={`tel:${garage.phoneRaw}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}
                        title="Click to call phone number"
                      >
                        {garage.phone}
                      </a>
                    </div>
                  </div>

                  {/* Service Badges */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.2rem' }}>
                    {garage.services.map((service, index) => (
                      <span
                        key={index}
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          background: '#f1f5f9',
                          color: '#334155',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        <CheckCircle2 size={12} color="#f97316" />
                        {service}
                      </span>
                    ))}
                  </div>

                  {/* Action Buttons: "Call Garage" and "Share" */}
                  <div style={{ display: 'flex', gap: '0.75rem' }} onClick={(e) => e.stopPropagation()}>
                    <a
                      href={`tel:${garage.phoneRaw}`}
                      className="btn btn-sm btn-primary"
                      style={{ flex: 1, textDecoration: 'none', gap: '0.45rem', borderRadius: '12px' }}
                    >
                      <Phone size={15} />
                      <span>Call Garage</span>
                    </a>

                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={(e) => handleShareGarage(garage, e)}
                      style={{ flex: 1, gap: '0.45rem', borderRadius: '12px' }}
                    >
                      <Share2 size={15} />
                      <span>Share</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </div>
  );
};
