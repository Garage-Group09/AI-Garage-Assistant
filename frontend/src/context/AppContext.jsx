import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext();
const API_BASE = '/api';

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchVehicles = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/vehicles/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setVehicles(data.map(v => ({
          id: v.vehicleId, brand: v.brand, fuelType: v.fuelType, vehicleType: v.vehicleType,
          modelId: v.modelId, year: v.year
        })));
      }
    } catch (err) {
      console.error('Failed to fetch vehicles', err);
    }
  };

  const loginUser = async (email, password) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        const data = await res.json();
        setUser({ userId: data.userId, name: data.name, email: data.email, isAdmin: data.isAdmin === true, isLoggedIn: true });
        showToast(`Welcome back, ${data.name}!`);
        await fetchVehicles(data.userId);
        return true;
      }
      showToast('Invalid email or password.');
      return false;
    } catch (err) {
      showToast('Cannot reach server. Is the backend running?');
      return false;
    }
  };

  const registerUser = async (name, email, password) => {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      if (res.ok) {
        showToast('Registration successful! Redirecting to login...');
        return true;
      }
      const errText = await res.text();
      showToast(errText || 'Registration failed.');
      return false;
    } catch (err) {
      showToast('Cannot reach server. Is the backend running?');
      return false;
    }
  };

  const logoutUser = () => {
    setUser(null);
    setVehicles([]);
    showToast('Logged out successfully.');
  };

  const addVehicle = async (newVehicle) => {
    if (!user) {
      showToast('Please log in first.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/vehicles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.userId,
          brand: newVehicle.brand,
          fuelType: newVehicle.fuelType,
          vehicleType: newVehicle.vehicleType,
          modelId: newVehicle.modelId ?? null,
          year: newVehicle.year ?? null
        })
      });
      if (res.ok) {
        const saved = await res.json();
        setVehicles(prev => [{
          id: saved.vehicleId, brand: saved.brand, fuelType: saved.fuelType, vehicleType: saved.vehicleType,
          modelId: saved.modelId, year: saved.year
        }, ...prev]);
        showToast(`Added ${newVehicle.brand} to your garage!`);
      } else {
        showToast('Failed to add vehicle.');
      }
    } catch (err) {
      showToast('Cannot reach server. Is the backend running?');
    }
  };

  const removeVehicle = (id) => {
    // local-only removal for tonight's demo - DELETE endpoint not built (out of scope)
    setVehicles(vehicles.filter(v => v.id !== id));
    showToast('Vehicle removed from garage.');
  };

  return (
    <AppContext.Provider value={{ user, vehicles, toastMessage, showToast, loginUser, registerUser, logoutUser, addVehicle, removeVehicle }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);