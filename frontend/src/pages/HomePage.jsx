import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Cpu, Car, MapPin, Sparkles, Shield, Mic, CheckCircle2, Zap } from 'lucide-react';

export const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1e40af 100%)',
          color: 'white',
          padding: '5rem 1.5rem 6rem 1.5rem',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Glow accent circles */}
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            right: '-10%',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(249, 115, 22, 0.25) 0%, rgba(249, 115, 22, 0) 70%)',
            borderRadius: '50%',
            pointerEvents: 'none'
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-20%',
            left: '-10%',
            width: '450px',
            height: '450px',
            background: 'radial-gradient(circle, rgba(37, 99, 235, 0.3) 0%, rgba(37, 99, 235, 0) 70%)',
            borderRadius: '50%',
            pointerEvents: 'none'
          }}
        />

        <div className="container" style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '900px' }}>
          {/* Top Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
              background: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(10px)',
              padding: '0.4rem 1.2rem',
              borderRadius: '50px',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: '#ffedd5',
              marginBottom: '1.8rem'
            }}
          >
            <Sparkles size={16} color="#f97316" />
            <span>Next Gen Multi Lingual AI Garage Platform</span>
          </div>

          {/* Main Heading */}
          <h1
            style={{
              fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-1px',
              marginBottom: '1.4rem'
            }}
          >
            Smart Vehicle Diagnostics <br />
            <span
              style={{
                background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Powered by AI Technology
            </span>
          </h1>

          {/* Welcoming Short Description */}
         

          {/* Large START Button -> Redirects to Login */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => navigate('/login')}
              style={{
                boxShadow: '0 10px 25px rgba(249, 115, 22, 0.45)',
                padding: '1.1rem 2.8rem',
                fontSize: '1.2rem'
              }}
            >
              <span>Start Diagnostic Assistant</span>
              <ArrowRight size={22} />
            </button>
          </div>

          {/* Feature Highlights Pill Bar */}
          <div
            style={{
              marginTop: '3.5rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.2rem',
              textAlign: 'left'
            }}
          >
            <div style={{ background: 'rgba(255,255,255,0.07)', padding: '1rem 1.2rem', borderRadius: '12px', backdropFilter: 'blur(5px)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ color: '#f97316', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mic size={18} /> Voice & Text Input
              </div>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>English, සිංහල, தமிழ் voice diagnosis</p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.07)', padding: '1rem 1.2rem', borderRadius: '12px', backdropFilter: 'blur(5px)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ color: '#60a5fa', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Car size={18} /> Garage Database
              </div>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>Store vehicle specs & maintenance history</p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.07)', padding: '1rem 1.2rem', borderRadius: '12px', backdropFilter: 'blur(5px)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ color: '#4ade80', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={18} />  Garage Finder
              </div>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>Find and navigate to nearby garages</p>
            </div>
          </div>
        </div>
      </section>
      {/* Features Overview Grid */}
      <section className="container" style={{ padding: '5rem 1.5rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 3.5rem auto' }}>
          <span style={{ color: 'var(--accent-orange)', fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Comprehensive Auto Assistant
          </span>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--primary-blue)' }}>
            Everything You Need for Vehicle Troubleshooting
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginTop: '0.6rem' }}>
            Designed for vehicle owners, drivers, and mechanics to identify mechanical faults quickly and locate reliable support.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {/* Card 1 */}
          <div className="card card-hover">
            <div style={{ width: '50px', height: '50px', background: 'var(--primary-blue-light)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-blue-mid)', marginBottom: '1.2rem' }}>
              <Cpu size={28} />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.6rem' }}>AI Mechanic Diagnosis</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Describe unusual engine sounds, warning lights, or performance issues. Our intelligent model provides instant root-cause analysis and repair estimates.
            </p>
          </div>

          {/* Card 2 */}
          <div className="card card-hover">
            <div style={{ width: '50px', height: '50px', background: 'var(--accent-orange-light)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-orange)', marginBottom: '1.2rem' }}>
              <Car size={28} />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.6rem' }}>Vehicle Information Hub</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Register your vehicles with brand, fuel type (Petrol, Diesel, Hybrid, Electric), and vehicle category to get customized diagnostic insights.
            </p>
          </div>

          {/* Card 3 */}
          <div className="card card-hover">
            <div style={{ width: '50px', height: '50px', background: '#dcfce7', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', marginBottom: '1.2rem' }}>
              <MapPin size={28} />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.6rem' }}>Garage Finder</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Locate nearby mechanics and breakdown services in real-time. Contact garages directly with one click or share your location.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
