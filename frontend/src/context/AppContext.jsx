import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();
const API_BASE = '/api';

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const getAuthHeaders = () => {
    let token = user?.token;
    if (!token) {
      try {
        const stored = sessionStorage.getItem('user');
        token = stored ? JSON.parse(stored)?.token : null;
      } catch {
        token = null;
      }
    }
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const handleAuthExpiry = () => {
    setUser((currentUser) => {
      if (currentUser) {
        try { sessionStorage.removeItem('user'); } catch {}
        showToast('Your session has expired. Please log in again.');
      }
      return null;
    });
    setVehicles([]);
  };

  const fetchVehicles = async (userId) => {
    if (!userId) {
      setVehicles([]);
      setVehiclesLoading(false);
      return;
    }
    setVehiclesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/vehicles/${userId}`, {
        headers: getAuthHeaders()
      });
      if (res.status === 401) {
        handleAuthExpiry();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setVehicles(data.map(v => ({
          id: v.vehicleId,
          brand: v.brand,
          fuelType: v.fuelType,
          vehicleType: v.vehicleType,
          modelId: v.modelId,
          modelName: v.modelName,
          year: v.year
        })));
      }
    } catch (err) {
      console.error('Failed to fetch vehicles', err);
    } finally {
      setVehiclesLoading(false);
    }
  };

  useEffect(() => {
    if (user?.userId) {
      fetchVehicles(user.userId);
    } else {
      setVehicles([]);
      setVehiclesLoading(false);
    }
  }, [user?.userId]);

  const loginUser = async (email, password) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        const data = await res.json();
        const userData = {
          userId: data.userId,
          name: data.name,
          email: data.email,
          isAdmin: data.isAdmin === true,
          token: data.token,
          isLoggedIn: true
        };
        setUser(userData);
        try {
          sessionStorage.setItem('user', JSON.stringify(userData));
        } catch (e) {
          console.warn('Could not save user to sessionStorage', e);
        }
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

  const logoutUser = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
    } catch (e) {
      console.warn('Backend logout request failed', e);
    }
    setUser(null);
    setVehicles([]);
    try {
      sessionStorage.removeItem('user');
    } catch (e) {
      console.warn('Could not clear user from sessionStorage', e);
    }
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
        headers: getAuthHeaders(),
        body: JSON.stringify({
          brand: newVehicle.brand,
          fuelType: newVehicle.fuelType,
          vehicleType: newVehicle.vehicleType,
          modelId: newVehicle.modelId ?? null,
          year: newVehicle.year ?? null
        })
      });
      if (res.status === 401) {
        handleAuthExpiry();
        return null;
      }
      if (res.ok) {
        const saved = await res.json();
        const mapped = {
          id: saved.vehicleId,
          brand: saved.brand,
          fuelType: saved.fuelType,
          vehicleType: saved.vehicleType,
          modelId: saved.modelId,
          modelName: saved.modelName,
          year: saved.year
        };
        setVehicles(prev => [mapped, ...prev]);
        showToast(`Added ${newVehicle.brand} to your garage!`);
        return mapped;
      } else {
        showToast('Failed to add vehicle.');
        return null;
      }
    } catch (err) {
      showToast('Cannot reach server. Is the backend running?');
      return null;
    }
  };

  const removeVehicle = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/vehicles/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.status === 401) {
        handleAuthExpiry();
        return;
      }
      if (res.ok) {
        setVehicles(prev => prev.filter(v => v.id !== id));
        showToast('Vehicle removed from garage.');
      } else {
        showToast('Failed to delete vehicle from server.');
      }
    } catch (err) {
      console.error('Delete vehicle error:', err);
      showToast('Cannot reach server to delete vehicle.');
    }
  };

  return (
    <AppContext.Provider value={{
      user,
      vehicles,
      vehiclesLoading,
      fetchVehicles,
      toastMessage,
      showToast,
      loginUser,
      registerUser,
      logoutUser,
      addVehicle,
      removeVehicle,
      getAuthHeaders,
      handleAuthExpiry
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);