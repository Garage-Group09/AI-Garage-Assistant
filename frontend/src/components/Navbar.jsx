import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Wrench, Home, Car, Cpu, MapPin, Menu, X, LogOut, LogIn, Shield } from 'lucide-react';
import { useApp } from '../context/AppContext';

/**
 * Modern Header Navigation Component for AI Garage Assistant.
 * Contains only essential navigation links: Home, Vehicle, Diagnosis, Garage Finder.
 */
export const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logoutUser } = useApp();
  const navigate = useNavigate();

  const toggleMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMenu = () => setMobileMenuOpen(false);

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Brand Logo */}
        <NavLink to="/" className="navbar-logo" onClick={closeMenu}>
          <div className="logo-icon">
            <Wrench size={22} />
          </div>
          <span>
            Smart Garage<span className="logo-highlight">.AI</span>
          </span>
        </NavLink>

        {/* Hamburger Toggle for Mobile */}
        <button
          className="mobile-toggle"
          onClick={toggleMenu}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X size={26} color="white" /> : <Menu size={26} color="white" />}
        </button>

        {/* Essential Navigation Links: Home, Vehicle, Diagnosis, Garage Finder */}
        <ul className={`nav-menu ${mobileMenuOpen ? 'open' : ''}`}>
          <li>
            <NavLink
              to="/"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={closeMenu}
              end
            >
              <Home size={18} />
              <span>Home</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/vehicles"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={closeMenu}
            >
              <Car size={18} />
              <span>Vehicle</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/diagnosis"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={closeMenu}
            >
              <Cpu size={18} />
              <span>Diagnosis</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/garages"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={closeMenu}
            >
              <MapPin size={18} />
              <span>Garage Finder</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/admin"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={closeMenu}
            >
              <Shield size={18} />
              <span>Admin Panel</span>
            </NavLink>
          </li>
        </ul>

        {/* Auth chip: shows user avatar+name+logout when logged in, Login link otherwise */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', padding: '0.3rem 0.75rem 0.3rem 0.3rem' }}>
              {/* Avatar circle */}
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%',
                background: 'var(--accent-orange)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.85rem', color: 'white', flexShrink: 0
              }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span style={{ color: 'white', fontSize: '0.88rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {user.name}
              </span>
              <button
                onClick={handleLogout}
                title="Logout"
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                  background: 'rgba(255,255,255,0.12)', border: 'none',
                  borderRadius: '999px', padding: '0.25rem 0.65rem',
                  color: 'white', fontSize: '0.8rem', fontWeight: 600,
                  cursor: 'pointer', transition: 'background 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(249,115,22,0.35)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                background: 'var(--accent-orange)', border: 'none',
                borderRadius: '999px', padding: '0.4rem 1rem',
                color: 'white', fontSize: '0.88rem', fontWeight: 700,
                cursor: 'pointer', transition: 'opacity 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
              onMouseOut={e => e.currentTarget.style.opacity = '1'}
            >
              <LogIn size={15} />
              Login
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};
