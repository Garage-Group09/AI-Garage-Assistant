import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VehiclePage } from './pages/VehiclePage';
import { DiagnosisPage } from './pages/DiagnosisPage';
import { GarageFinderPage } from './pages/GarageFinderPage';
import { AdminPanel } from './pages/AdminPanel';
import { CheckCircle } from 'lucide-react';

const ToastNotification = () => {
  const { toastMessage } = useApp();
  if (!toastMessage) return null;

  return (
    <div className="toast-container">
      <div className="toast">
        <CheckCircle size={20} color="var(--accent-orange)" />
        <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>{toastMessage}</span>
      </div>
    </div>
  );
};

export const App = () => {
  return (
    <AppProvider>
      <Router>
        <div className="app-container">
          {/* Navigation Bar - Home, Login, Vehicle, Diagnosis, Garage Finder, Admin */}
          <Navbar />

          {/* Main Body */}
          <main className="main-content">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/vehicles" element={<VehiclePage />} />
              <Route path="/diagnosis" element={<DiagnosisPage />} />
              <Route path="/garages" element={<GarageFinderPage />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          {/* Footer */}
          <Footer />

          {/* Floating Toast Notification */}
          <ToastNotification />
        </div>
      </Router>
    </AppProvider>
  );
};

export default App;
