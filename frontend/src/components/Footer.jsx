import React from 'react';
import { Wrench, ShieldCheck, Heart } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-brand"style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: '#207ff3' }}>
          <div className="logo-icon" style={{ width: '28px', height: '28px' }}>
            <Wrench size={16} />
          </div>
          <span>AI Garage Assistant</span>
        </div>
       
        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: '#187ffd' }}>
          <span><ShieldCheck size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Certified Diagnostics</span>
          <span>• 24/7 Virtual Assistant</span>
          <span>• Sinhala / Tamil / English</span>
        </div>
        <div style={{ fontSize: '0.8rem', color: '#434445', marginTop: '0.5rem' }}>
          © {new Date().getFullYear()} AI Garage Assistant. All rights reserved. Designed for optimal performance.
        </div>
      </div>
    </footer>
  );
};
