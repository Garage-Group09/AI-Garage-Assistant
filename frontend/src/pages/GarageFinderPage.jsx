import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Phone, Share2, Star, Clock, Wrench, Search, Navigation, CheckCircle2, ShieldCheck, Compass, Radio } from 'lucide-react';
import { useApp } from '../context/AppContext';

// Default map viewport coordinates used when no garage is selected or GPS unavailable
const DEFAULT_CENTER = [9.6615, 80.0255]; // Jaffna, Sri Lanka

/**
 * Validates that latitude and longitude are valid numbers within global coordinate ranges
 */
const isCoordinatesValid = (lat, lng) => {
  if (lat == null || lng == null) return false;
  const nLat = Number(lat);
  const nLng = Number(lng);
  return !isNaN(nLat) && !isNaN(nLng) && nLat >= -90 && nLat <= 90 && nLng >= -180 && nLng <= 180 && (nLat !== 0 || nLng !== 0);
};

/**
 * Constructs Google Maps Turn-by-Turn or Demo Route URL safely using URLSearchParams
 * Omit origin by default so Google Maps uses the device's current location.
 * Requires no Google Maps API key.
 * For demo records, omits dir_action=navigate to show route preview rather than encouraging travel to fictional business.
 */
const buildGoogleMapsUrl = (lat, lng, isDemo = false) => {
  if (!isCoordinatesValid(lat, lng)) return null;
  const params = new URLSearchParams();
  params.set('api', '1');
  params.set('destination', `${lat},${lng}`);
  params.set('travelmode', 'driving');
  if (!isDemo) {
    params.set('dir_action', 'navigate');
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

/**
 * Helper to calculate Haversine distance between two coordinates in km
 */
const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Maps a Garage API response to the shape expected by this component.
 * Uses real latitude and longitude from DB if present. Never invents default coordinates for records.
 * Unknown optional fields remain null (no invented ratings, reviews, or operating hours).
 */
const toUiGarage = (g) => {
  const hasLat = g.latitude != null && !isNaN(Number(g.latitude));
  const hasLng = g.longitude != null && !isNaN(Number(g.longitude));
  const validCoords = hasLat && hasLng && isCoordinatesValid(g.latitude, g.longitude);
  const isDemo = g.isDemo !== undefined ? Boolean(g.isDemo) : Boolean((g.garageName && g.garageName.toLowerCase().includes('demo')));

  return {
    id:          g.garageId,
    name:        g.garageName    ?? 'Unknown Garage',
    rating:      (g.rating != null && !isNaN(Number(g.rating)) && Number(g.rating) > 0) ? Number(g.rating) : null,
    reviews:     null,
    type:        g.specialization ?? 'Auto repair shop',
    address:     g.location      ?? 'Location not specified',
    phone:       (g.phoneNo && g.phoneNo !== 'N/A' && g.phoneNo.trim()) ? g.phoneNo.trim() : null,
    phoneRaw:    (g.phoneNo ?? '').replace(/\D/g, ''),
    lat:         validCoords ? Number(g.latitude) : null,
    lng:         validCoords ? Number(g.longitude) : null,
    hasValidCoords: validCoords,
    isDemo:      isDemo,
    openStatus:  null,
    distance:    '',
    distanceKm:  null,
    services:    g.specialization ? g.specialization.split(',').map((s) => s.trim()).filter(Boolean) : []
  };
};

/**
 * Helper component to re-center Leaflet Map when target center or zoom changes
 */
const MapRecenter = ({ center, zoom = 13 }) => {
  const map = useMap();
  useEffect(() => {
    if (center && Number.isFinite(center[0]) && Number.isFinite(center[1])) {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, map, zoom]);
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
 * Create User Location Marker Pin (glowing blue pulse)
 */
const createUserLocationIcon = () => {
  return L.divIcon({
    className: 'custom-user-location-pin',
    html: `
      <div style="
        background: #0284c7;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 0 0 6px rgba(2, 132, 199, 0.4), 0 4px 10px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13]
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
  const { user, showToast, getAuthHeaders, handleAuthExpiry } = useApp();
  const location = useLocation();

  // ── Garage data from API ─────────────────────────────────────────────────
  const [garages, setGarages]             = useState([]);
  const [garagesLoading, setGaragesLoading] = useState(false);
  const [selectedGarage, setSelectedGarage] = useState(null);
  const [searchQuery, setSearchQuery]     = useState('');
  const [isLocating, setIsLocating]       = useState(false);
  const [isTracking, setIsTracking]       = useState(false);
  const [userLocation, setUserLocation]   = useState(null);
  const [mapTarget, setMapTarget]         = useState(null);
  const [includeDemo, setIncludeDemo]     = useState(false);
  const [recommendationMeta, setRecommendationMeta] = useState(null);

  const watchIdRef = useRef(null);
  const hasCenteredOnTrackingRef = useRef(false);

  // Clean up geolocation watcher on component unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) {
        try {
          navigator.geolocation.clearWatch(watchIdRef.current);
        } catch (e) {}
        watchIdRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setGaragesLoading(true);
    fetch(`/api/garages?includeDemo=${includeDemo}`)
      .then((res) => res.ok ? res.json() : Promise.reject(res.status))
      .then((data) => {
        const mapped = data.map(toUiGarage);
        setGarages(mapped);
        if (mapped.length > 0) setSelectedGarage(mapped[0]);
      })
      .catch((err) => {
        console.error('Failed to fetch garages:', err);
        showToast?.('Could not load garages from server.');
      })
      .finally(() => setGaragesLoading(false));
  }, [includeDemo]);

  // Fetch recommendation metadata if navigating from diagnosis
  useEffect(() => {
    if (location.state?.fromDiagnosis && user?.userId) {
      const params = new URLSearchParams();
      if (location.state.vehicleId) {
        params.set('vehicleId', location.state.vehicleId);
      }
      if (location.state.sessionId) params.set('sessionId', location.state.sessionId);
      params.set('includeDemo', String(includeDemo));
      if (userLocation) {
        params.set('lat', userLocation.lat);
        params.set('lng', userLocation.lng);
      }
      fetch(`/api/garages/recommend/${user.userId}?${params.toString()}`, {
        headers: getAuthHeaders ? getAuthHeaders() : {}
      })
        .then((res) => {
          if (res.status === 401) {
            handleAuthExpiry?.();
            return null;
          }
          return res.ok ? res.json() : null;
        })
        .then((data) => {
          if (data) {
            setRecommendationMeta(data);
          }
        })
        .catch(() => {});
    }
  }, [location.state, user?.userId, userLocation, includeDemo]);

  // Compute displayed garages with real-time approximate straight-line distance
  const displayedGarages = React.useMemo(() => {
    let list = garages;
    if (userLocation) {
      list = list.map((g) => {
        if (!isCoordinatesValid(g.lat, g.lng)) {
          return {
            ...g,
            distanceKm: null,
            distance: 'Coordinates unavailable'
          };
        }
        const d = getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, g.lat, g.lng);
        return {
          ...g,
          distanceKm: d,
          distance: d < 1 ? `~${Math.round(d * 1000)} m (straight-line)` : `~${d.toFixed(1)} km (straight-line)`
        };
      }).sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
    }
    return list;
  }, [garages, userLocation]);

  // Filter garages by search query (name, address, type, or service)
  const filteredGarages = displayedGarages.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.services.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // GPS Location detector (one-shot lock) using HTML5 Geolocation API
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      showToast?.('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    showToast?.('Detecting your GPS coordinates...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const uLat = position.coords.latitude;
        const uLng = position.coords.longitude;
        const accuracy = Math.round(position.coords.accuracy || 0);
        setUserLocation({ lat: uLat, lng: uLng, accuracy });
        setMapTarget({ center: [uLat, uLng], zoom: 14 });
        setIsLocating(false);
        showToast?.(`GPS Locked: ${uLat.toFixed(4)}, ${uLng.toFixed(4)} (±${accuracy}m)`);
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        if (err.code === 1) {
          showToast?.('Location permission denied. Please allow location access or check HTTPS.');
        } else if (err.code === 3) {
          showToast?.('GPS request timed out. Please retry.');
        } else {
          showToast?.('Could not detect location. Using default region map view.');
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Explicit continuous live location tracking using watchPosition
  const handleToggleLiveTracking = () => {
    if (!navigator.geolocation) {
      showToast?.('Geolocation is not supported by your browser.');
      return;
    }

    if (isTracking) {
      if (watchIdRef.current != null) {
        try {
          navigator.geolocation.clearWatch(watchIdRef.current);
        } catch (e) {}
        watchIdRef.current = null;
      }
      setIsTracking(false);
      showToast?.('Live GPS tracking stopped.');
      return;
    }

    setIsTracking(true);
    hasCenteredOnTrackingRef.current = false;
    showToast?.('Starting continuous GPS tracking...');

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const uLat = position.coords.latitude;
          const uLng = position.coords.longitude;
          const accuracy = Math.round(position.coords.accuracy || 0);
          setUserLocation({ lat: uLat, lng: uLng, accuracy });

          // Center map only on the FIRST position lock to avoid hijacking user map pan / garage selection!
          if (!hasCenteredOnTrackingRef.current) {
            setMapTarget({ center: [uLat, uLng], zoom: 14 });
            hasCenteredOnTrackingRef.current = true;
          }
        },
        (err) => {
          console.warn('Geolocation tracking error:', err);
          if (watchIdRef.current != null) {
            try { navigator.geolocation.clearWatch(watchIdRef.current); } catch (e) {}
            watchIdRef.current = null;
          }
          setIsTracking(false);
          if (err.code === 1) {
            showToast?.('Location permission denied. Please allow location access or check HTTPS.');
          } else if (err.code === 3) {
            showToast?.('GPS tracking timed out. Retrying...');
          } else {
            showToast?.(`Tracking error: ${err.message}`);
          }
        },
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
      );
    } catch (e) {
      setIsTracking(false);
      showToast?.('Failed to start continuous GPS tracking.');
    }
  };

  // Share Garage Details handler (Web Share API with Clipboard Fallback)
  const handleShareGarage = (garage, e) => {
    e?.stopPropagation();
    const mapUrl = isCoordinatesValid(garage.lat, garage.lng)
      ? `https://maps.google.com/?q=${garage.lat},${garage.lng}`
      : garage.address;
    const shareText = `Garage: ${garage.name}\nType: ${garage.type}\nRating: ${garage.rating}⭐ (${garage.reviews} reviews)\nAddress: ${garage.address}\nPhone: ${garage.phone}\nMap: ${mapUrl}`;

    if (navigator.share) {
      navigator.share({
        title: garage.name,
        text: shareText,
        url: mapUrl
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
        className="garage-finder-header"
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
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <MapPin size={28} color="#f97316" style={{ flexShrink: 0 }} />
            <span>Garage Finder & Auto Workshops</span>
          </h1>
          <p style={{ color: '#cbd5e1', fontSize: '0.98rem', marginTop: '0.3rem' }}>
            Discover top-rated auto repair shops, mechanics & 24/7 breakdown assistance
          </p>
        </div>

        {/* GPS Control Buttons: Locate Me + Live Tracking */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* One-shot GPS Lock */}
          <button
            className="btn btn-primary garage-locate-btn"
            onClick={handleDetectLocation}
            disabled={isLocating}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '12px' }}
          >
            <Navigation size={18} className={isLocating ? 'spin' : ''} style={{ flexShrink: 0 }} />
            <span>{isLocating ? 'Locating...' : 'Locate Me'}</span>
          </button>

          {/* Continuous Live Tracking Toggle */}
          <button
            type="button"
            className="btn btn-sm garage-track-btn"
            onClick={handleToggleLiveTracking}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderRadius: '12px',
              padding: '0.58rem 1rem',
              background: isTracking ? '#ef4444' : 'rgba(255,255,255,0.15)',
              border: isTracking ? '1px solid #f87171' : '1px solid rgba(255,255,255,0.3)',
              color: 'white',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            title="Explicit Start/Stop continuous GPS tracking via watchPosition"
          >
            <Radio size={16} style={{ flexShrink: 0 }} />
            <span>{isTracking ? 'Stop Tracking' : 'Live Tracking'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Interactive Map on Left, Garage Cards on Right */}
      <div className="garage-finder-grid">
        
        {/* Left Side: Interactive Leaflet.js Map */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          <div
            className="card garage-map-card"
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
            {/* Interactive Leaflet Map centered on selected garage or user location */}
            <MapContainer
              center={
                selectedGarage && isCoordinatesValid(selectedGarage.lat, selectedGarage.lng)
                  ? [selectedGarage.lat, selectedGarage.lng]
                  : DEFAULT_CENTER
              }
              zoom={13}
              scrollWheelZoom={true}
              style={{ width: '100%', height: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {mapTarget ? (
                <MapRecenter center={mapTarget.center} zoom={mapTarget.zoom} />
              ) : selectedGarage && isCoordinatesValid(selectedGarage.lat, selectedGarage.lng) ? (
                <MapRecenter center={[selectedGarage.lat, selectedGarage.lng]} zoom={13} />
              ) : null}

              {/* User Location Marker with Glowing Pulse */}
              {userLocation && (
                <Marker position={[userLocation.lat, userLocation.lng]} icon={createUserLocationIcon()}>
                  <Popup>
                    <div style={{ padding: '4px', textAlign: 'center' }}>
                      <strong style={{ color: '#0284c7', fontSize: '0.92rem' }}>📍 Your Current Location</strong>
                      <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                        Accuracy: ±{userLocation.accuracy ?? 15}m
                      </p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Only plot markers for garages with valid coordinates */}
              {garages
                .filter((g) => isCoordinatesValid(g.lat, g.lng))
                .map((garage) => {
                  const isSelected = selectedGarage?.id === garage.id;
                  const navUrl = buildGoogleMapsUrl(garage.lat, garage.lng, garage.isDemo);

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
                        <div style={{ padding: '4px', maxWidth: '220px' }}>
                          <strong style={{ color: '#1e3a8a', fontSize: '0.95rem' }}>{garage.name}</strong>
                          <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>{garage.type}</div>
                          <p style={{ margin: '4px 0', fontSize: '0.8rem', color: '#64748b' }}>📍 {garage.address}</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                            <a href={`tel:${garage.phoneRaw}`} style={{ color: '#2563eb', fontWeight: 700, fontSize: '0.8rem', textDecoration: 'none' }}>
                              📞 {garage.phone}
                            </a>
                            {navUrl && (
                              <a
                                href={navUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#f97316', fontWeight: 700, fontSize: '0.8rem', textDecoration: 'none' }}
                              >
                                🧭 {garage.isDemo ? 'Preview demo route' : 'Navigate (Google Maps)'}
                              </a>
                            )}
                          </div>
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
              className="card garage-selected-card"
              style={{
                borderRadius: '20px',
                borderLeft: '5px solid #f97316',
                padding: '1.3rem 1.6rem',
                background: 'white',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.8rem' }}>
                <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                    <span className="badge badge-orange">
                      Selected Workshop
                    </span>
                    {selectedGarage.isDemo && (
                      <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>
                        Demo Garage
                      </span>
                    )}
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e3a8a', wordBreak: 'break-word', margin: 0 }}>
                    {selectedGarage.name}
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '0.3rem', marginBottom: '0.2rem' }}>
                    📍 {selectedGarage.address} • <span style={{ color: '#f97316', fontWeight: 700 }}>{displayedGarages.find(g => g.id === selectedGarage.id)?.distance || 'Distance pending'}</span>
                  </p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                    ℹ️ Approximate straight-line distance. Turn-by-turn navigation opens in Google Maps without requiring an API key (desktop or unavailable GPS shows route preview).
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* Call Button */}
                  <a
                    href={`tel:${selectedGarage.phoneRaw}`}
                    className="btn btn-outline btn-sm garage-call-btn"
                    style={{ textDecoration: 'none', gap: '0.4rem', borderRadius: '12px' }}
                  >
                    <Phone size={15} style={{ flexShrink: 0 }} /> <span>Call</span>
                  </a>

                  {/* Navigation / Demo Route Action */}
                  {isCoordinatesValid(selectedGarage.lat, selectedGarage.lng) ? (
                    <a
                      href={buildGoogleMapsUrl(selectedGarage.lat, selectedGarage.lng, selectedGarage.isDemo)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary btn-sm"
                      style={{
                        textDecoration: 'none',
                        gap: '0.45rem',
                        borderRadius: '12px',
                        background: selectedGarage.isDemo ? '#f97316' : 'linear-gradient(135deg, #1e3a8a, #2563eb)'
                      }}
                      title={selectedGarage.isDemo ? "Preview demo route in Google Maps (dir_action omitted)" : "Start live turn-by-turn navigation in Google Maps"}
                    >
                      <Compass size={15} style={{ flexShrink: 0 }} />
                      <span>{selectedGarage.isDemo ? 'Preview demo route' : 'Navigate with Google Maps'}</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="btn btn-sm btn-outline"
                      style={{ borderRadius: '12px', opacity: 0.5, cursor: 'not-allowed', gap: '0.4rem' }}
                      title="Coordinates unavailable for this garage"
                    >
                      <Compass size={15} style={{ flexShrink: 0 }} />
                      <span>Coordinates unavailable</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Side: Demo Garage Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', minWidth: 0 }}>
          
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

          {/* Tailored Recommendation Notice */}
          {recommendationMeta && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '0.65rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <Wrench size={16} color="#2563eb" style={{ flexShrink: 0 }} />
              <div>
                <span style={{ fontWeight: 700, color: '#1e40af' }}>
                  {recommendationMeta.faultName ? `Recommended for: ${recommendationMeta.faultName}` : 'Workshops matched to your diagnosis'}
                </span>
                {recommendationMeta.matchedKeyword && (
                  <span style={{ color: '#3b82f6', marginLeft: '0.4rem', fontSize: '0.78rem' }}>
                    (Specialization: {recommendationMeta.matchedKeyword})
                  </span>
                )}
              </div>
            </div>
          )}

          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span>Available Repair Shops ({filteredGarages.length})</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <input
                  type="checkbox"
                  checked={includeDemo}
                  onChange={(e) => setIncludeDemo(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                Include demo entries
              </label>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>• Local Directory</span>
            </div>
          </div>

          {/* Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', overflowY: 'auto', maxHeight: '620px', paddingRight: '4px' }}>
            {filteredGarages.map((garage) => {
              const isSelected = selectedGarage?.id === garage.id;
              const hasCoords = isCoordinatesValid(garage.lat, garage.lng);
              const navUrl = hasCoords ? buildGoogleMapsUrl(garage.lat, garage.lng, garage.isDemo) : null;

              return (
                <div
                  key={garage.id}
                  className="card card-hover garage-item-card"
                  onClick={() => {
                    setSelectedGarage(garage);
                    if (hasCoords) {
                      setMapTarget({ center: [garage.lat, garage.lng], zoom: 14 });
                    }
                  }}
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
                    <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e3a8a', lineHeight: 1.3, wordBreak: 'break-word', margin: 0 }}>
                          {garage.name}
                        </h3>
                        {garage.isDemo && (
                          <span style={{ fontSize: '0.72rem', background: '#e0f2fe', color: '#0369a1', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>
                            Demo
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        {garage.type}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f97316', background: '#ffedd5', padding: '0.25rem 0.65rem', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {garage.distance}
                    </span>
                  </div>

                  {/* Rating Stars or Unlisted */}
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem', fontSize: '0.88rem', margin: '0.6rem 0' }}>
                    {garage.rating != null ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#b45309', fontWeight: 700, background: '#fef3c7', padding: '0.2rem 0.6rem', borderRadius: '8px', flexShrink: 0 }}>
                        <Star size={15} fill="#f59e0b" color="#f59e0b" style={{ flexShrink: 0 }} />
                        <span>{garage.rating.toFixed(1)}</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Rating unlisted</span>
                    )}

                    {garage.openStatus && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#16a34a', fontWeight: 600, fontSize: '0.8rem' }}>
                        <Clock size={14} style={{ flexShrink: 0 }} />
                        <span>{garage.openStatus}</span>
                      </div>
                    )}
                  </div>

                  {/* Address & Click-to-Call Phone Number */}
                  <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <MapPin size={15} color="#2563eb" style={{ flexShrink: 0 }} />
                      <span style={{ minWidth: 0, wordBreak: 'break-word' }}>{garage.address}</span>
                    </div>

                    {garage.phone ? (
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
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        <Phone size={15} style={{ flexShrink: 0, opacity: 0.5 }} />
                        <span>Phone unlisted</span>
                      </div>
                    )}
                  </div>

                  {/* Service Badges */}
                  {garage.services && garage.services.length > 0 && (
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
                          <CheckCircle2 size={12} color="#f97316" style={{ flexShrink: 0 }} />
                          {service}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons: "Call Garage", "Navigate/Preview", and "Share" */}
                  <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
                    {garage.phone ? (
                      <a
                        href={`tel:${garage.phoneRaw}`}
                        className="btn btn-sm btn-outline"
                        style={{ flex: 1, minWidth: '90px', textDecoration: 'none', gap: '0.4rem', borderRadius: '12px', justifyContent: 'center' }}
                      >
                        <Phone size={14} style={{ flexShrink: 0 }} />
                        <span>Call</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="btn btn-sm btn-outline"
                        style={{ flex: 1, minWidth: '90px', gap: '0.4rem', borderRadius: '12px', justifyContent: 'center', opacity: 0.5, cursor: 'not-allowed' }}
                      >
                        <Phone size={14} style={{ flexShrink: 0 }} />
                        <span>No Phone</span>
                      </button>
                    )}

                    {hasCoords ? (
                      <a
                        href={navUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-primary"
                        style={{
                          flex: 2,
                          minWidth: '130px',
                          textDecoration: 'none',
                          gap: '0.4rem',
                          borderRadius: '12px',
                          justifyContent: 'center',
                          background: garage.isDemo ? '#f97316' : 'linear-gradient(135deg, #1e3a8a, #2563eb)'
                        }}
                        title={garage.isDemo ? "Preview demo route in Google Maps (dir_action omitted)" : "Navigate to workshop with Google Maps"}
                      >
                        <Compass size={14} style={{ flexShrink: 0 }} />
                        <span>{garage.isDemo ? 'Preview demo route' : 'Navigate (Maps)'}</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="btn btn-sm btn-outline"
                        style={{ flex: 2, minWidth: '130px', gap: '0.4rem', borderRadius: '12px', justifyContent: 'center', opacity: 0.5, cursor: 'not-allowed' }}
                      >
                        <Compass size={14} style={{ flexShrink: 0 }} />
                        <span>No GPS</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={(e) => handleShareGarage(garage, e)}
                      style={{ flex: 1, minWidth: '80px', gap: '0.4rem', borderRadius: '12px', justifyContent: 'center' }}
                    >
                      <Share2 size={14} style={{ flexShrink: 0 }} />
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
