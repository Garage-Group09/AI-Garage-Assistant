import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Send, Mic, MicOff, Bot, User, MapPin, Sparkles, Languages, Volume2, VolumeX, Car, ShieldAlert, LogIn, ChevronDown, Wrench } from 'lucide-react';

/**
 * Modern AI Garage Assistant DiagnosisPage Component
 * Features:
 * - Multi-lingual support (English, Sinhala, Tamil)
 * - Saved Vehicle Requirement & Verification
 * - Scoped Per-Vehicle Diagnosis History
 * - SpeechRecognition API for voice input via microphone
 * - SpeechSynthesis API for text-to-speech reading AI responses aloud
 * - Connects to backend API POST /api/diagnosis
 * - Auto-scrolling to bottom on new messages
 */
export const DiagnosisPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, vehicles, vehiclesLoading, showToast, getAuthHeaders, handleAuthExpiry } = useApp();

  // Selected language state: 'en' | 'si' | 'ta'
  const [language, setLanguage] = useState('en');
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected vehicle state
  const [selectedVehicleId, setSelectedVehicleId] = useState(() => {
    if (location.state?.selectedVehicleId) return Number(location.state.selectedVehicleId);
    if (!user?.userId) return null;
    try {
      const stored = sessionStorage.getItem(`diagnosis_vehicle_${user.userId}`);
      return stored && Number.isFinite(Number(stored)) ? Number(stored) : null;
    } catch { return null; }
  });

  // Helper to generate a unique session identifier
  const generateSessionId = () => 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

  // Active diagnostic session ID — restores from sessionStorage on refresh or creates a new one
  const [sessionId, setSessionId] = useState(() => {
    if (user?.userId && selectedVehicleId) {
      const vid = selectedVehicleId;
      const stored = sessionStorage.getItem(`diagnosis_session_${user.userId}_${vid}`);
      if (stored) return stored;
    }
    return generateSessionId();
  });

  // Track active vehicle in a ref for safe async response scoping
  const activeVehicleIdRef = useRef(selectedVehicleId);
  useEffect(() => {
    activeVehicleIdRef.current = selectedVehicleId;
  }, [selectedVehicleId]);

  // Synchronize or restore session ID when active user and vehicle change
  useEffect(() => {
    if (user?.userId && selectedVehicleId) {
      sessionStorage.setItem(`diagnosis_vehicle_${user.userId}`, String(selectedVehicleId));
      const key = `diagnosis_session_${user.userId}_${selectedVehicleId}`;
      let sid = sessionStorage.getItem(key);
      if (!sid) {
        sid = generateSessionId();
        sessionStorage.setItem(key, sid);
      }
      setSessionId(sid);
    }
  }, [user?.userId, selectedVehicleId]);

  // Handle vehicle selection logic
  useEffect(() => {
    if (location.state?.selectedVehicleId) {
      setSelectedVehicleId(location.state.selectedVehicleId);
    } else if (vehicles.length === 1 && !selectedVehicleId) {
      // Auto-select single vehicle
      setSelectedVehicleId(vehicles[0].id);
    } else if (vehicles.length > 1 && selectedVehicleId && !vehicles.some(v => v.id === selectedVehicleId)) {
      setSelectedVehicleId(null);
    }
  }, [vehicles, location.state?.selectedVehicleId]);

  const activeVehicle = vehicles.find(v => v.id === selectedVehicleId) || null;

  const chatBottomRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  const buildInitialGreeting = (veh) => {
    if (!veh) {
      return {
        id: 1,
        sender: 'ai',
        text: "Hi! Please select or register a vehicle above to start a tailored AI diagnosis.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    }
    const vehName = `${veh.brand} ${veh.modelName || ''}`.trim();
    return {
      id: 1,
      sender: 'ai',
      text: `Hi! I'm ready to diagnose your ${vehName} (${veh.year || 'Year unspecified'}). Describe your vehicle's symptom below — for example, engine knocking, brake squeal, or warning lights — and I'll help figure out what's going on.`,
      suggestion: `My ${vehName} makes a rattling sound when I accelerate`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  // Initial chat history with sequential demo flow messages on page load
  const [messages, setMessages] = useState(() => [buildInitialGreeting(activeVehicle)]);

  // When active vehicle changes, start a separate scoped conversation for that vehicle
  const handleVehicleChange = (newId) => {
    if (isSubmitting) return; // prevent switching while request is in-flight
    const numId = Number(newId);
    setSelectedVehicleId(numId);
    const chosen = vehicles.find(v => v.id === numId);
    setMessages([buildInitialGreeting(chosen)]);
  };

  // Auto-scroll chat to bottom whenever messages list changes
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load prior messages for this vehicle and session (preserves intended active session on refresh)
  useEffect(() => {
    if (!user?.userId || !selectedVehicleId || !sessionId) return;
    const controller = new AbortController();
    const authHdrs = getAuthHeaders ? getAuthHeaders() : {};
    fetch(`/api/chat-history/${user.userId}?vehicleId=${selectedVehicleId}&sessionId=${encodeURIComponent(sessionId)}`, {
      headers: authHdrs, signal: controller.signal
    })
      .then(res => {
        if (res.status === 401) {
          handleAuthExpiry?.();
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then(data => {
        if (controller.signal.aborted) return;
        if (data && Array.isArray(data) && data.length > 0) {
          const loaded = data.map((item, idx) => ({
            id: idx + 1,
            sender: item.sender.toLowerCase(),
            text: item.message,
            time: '',
            diagnosisData: item.diagnosisData || null
          }));
          setMessages(loaded);
        } else {
          setMessages([buildInitialGreeting(activeVehicle)]);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [user?.userId, selectedVehicleId, sessionId]);

  /**
   * Microphone Voice Input Handler using browser SpeechRecognition API
   */
  const toggleSpeechRecognition = () => {
    if (!user || vehiclesLoading || !activeVehicle) {
      showToast?.('Please log in and select a vehicle before using voice input.');
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      showToast?.('Voice input requires browser speech recognition and HTTPS.');
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
      setIsRecording(false);
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;

      // Set speech recognition language based on selected language
      if (language === 'si') recognition.lang = 'si-LK';
      else if (language === 'ta') recognition.lang = 'ta-LK';
      else recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
        setIsRecording(false);
      };

      recognition.onerror = (event) => {
        setIsRecording(false);
        if (event.error !== 'no-speech') {
          showToast?.(`Microphone error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch (err) {
      setIsRecording(false);
      showToast?.('Could not start microphone. Check browser permissions or HTTPS.');
    }
  };

  /**
   * Speaker Button Handler: Read AI message text aloud using browser SpeechSynthesis API
   */
  const handleReadAloud = (msgId, text) => {
    if (!('speechSynthesis' in window)) {
      showToast?.('Speech synthesis is not supported in this browser.');
      return;
    }

    // If currently speaking this message, stop it
    if (speakingMessageId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    // Cancel any ongoing speech before starting new one
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Set utterance language code
    if (language === 'si') utterance.lang = 'si-LK';
    else if (language === 'ta') utterance.lang = 'ta-LK';
    else utterance.lang = 'en-US';

    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    setSpeakingMessageId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  /**
   * Send user message to Backend API POST /api/diagnosis
   */
  const handleSendMessage = async (e, textToSend) => {
    e?.preventDefault();
    if (!user) {
      showToast?.('Please log in first to diagnose vehicle issues.');
      return;
    }
    if (!activeVehicle || !selectedVehicleId) {
      showToast?.('Please select a saved vehicle before starting diagnosis.');
      return;
    }

    const userMessageText = (typeof textToSend === 'string' ? textToSend : inputText).trim();
    if (!userMessageText || isSubmitting) return;

    const requestVehicleId = selectedVehicleId;

    // Create user message bubble
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: userMessageText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsSubmitting(true);

    let replyText = '';
    let isError = false;
    let diagnosisData = null;

    try {
      // Connect to backend API endpoint POST /api/diagnosis with active sessionId
      const authHdrs = getAuthHeaders ? getAuthHeaders() : { 'Content-Type': 'application/json' };
      const response = await fetch('/api/diagnosis', {
        method: 'POST',
        headers: authHdrs,
        body: JSON.stringify({
          message: userMessageText,
          language: language,
          vehicleId: requestVehicleId,
          sessionId: sessionId
        })
      });

      if (response.status === 401) {
        handleAuthExpiry?.();
        return;
      }

      const data = await response.json().catch(() => null);

      if (response.ok && data?.diagnosis && data.diagnosis.trim()) {
        replyText = data.diagnosis.trim();
        // Store structured diagnosis metadata for display
        diagnosisData = {
          responseType: data.responseType || 'CLARIFICATION',
          faultName: data.faultName || null,
          possibleCause: data.possibleCause || null,
          safeToDrive: data.safeToDrive !== undefined ? data.safeToDrive : null,
          confidence: data.confidence !== undefined ? data.confidence : null,
          costEstimate: data.costEstimate || null,
        };
      } else {
        isError = true;
        const errDetail = data?.error || (response.status === 504 ? 'Request timed out — please try again.' : `Service error (HTTP ${response.status})`);
        replyText = `⚠️ ${errDetail}`;
        // Preserve user's message in input for quick retry
        setInputText(userMessageText);
      }
    } catch (err) {
      isError = true;
      replyText = '⚠️ Could not connect to diagnostic service. Please verify the backend is running and tap retry.';
      // Preserve user's message in input for quick retry
      setInputText(userMessageText);
    } finally {
      // Safety check: if user switched vehicles while waiting for response, discard reply
      if (replyText && activeVehicleIdRef.current === requestVehicleId) {
        const aiReply = {
          id: Date.now() + 1,
          sender: 'ai',
          text: replyText,
          isError: isError,
          retryText: isError ? userMessageText : null,
          diagnosisData: diagnosisData,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiReply]);
      } else {
        console.log('Discarding diagnosis reply because active vehicle changed during request.');
      }
      setIsSubmitting(false);
    }
  };

  /**
   * Starts a new isolated diagnosis session for the active vehicle without mixing prior symptom context
   */
  const handleNewDiagnosis = () => {
    if (isSubmitting) return;
    const newSid = generateSessionId();
    setSessionId(newSid);
    if (user?.userId && selectedVehicleId) {
      try {
        sessionStorage.setItem(`diagnosis_session_${user.userId}_${selectedVehicleId}`, newSid);
      } catch (e) {}
    }
    setMessages([buildInitialGreeting(activeVehicle)]);
    setInputText('');
    showToast?.('Started a new diagnosis session for ' + (activeVehicle ? `${activeVehicle.brand} ${activeVehicle.modelName || ''}` : 'your vehicle'));
  };

  /**
   * Quick Action: Redirect to Garage Finder page with vehicleId state
   */
  const handleShowNearbyGarages = () => {
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: 'Show nearby garages and mechanic workshops',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const aiMsg = {
      id: Date.now() + 1,
      sender: 'ai',
      text: 'I am redirecting you to the interactive Garage Finder map to view listed workshops near your location...',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg, aiMsg]);
    setTimeout(() => {
      navigate('/garages', { state: { vehicleId: activeVehicle?.id, sessionId, fromDiagnosis: true } });
    }, 1200);
  };

  const isDiagnosisAllowed = Boolean(user && !vehiclesLoading && activeVehicle);

  const getInputPlaceholder = () => {
    if (!user) return 'Please log in to start vehicle diagnosis...';
    if (vehiclesLoading) return 'Loading your registered vehicles...';
    if (vehicles.length === 0) return 'Add a vehicle to start diagnosis...';
    if (!activeVehicle) return 'Select a vehicle to start diagnosis...';
    if (language === 'si') return 'ඔබගේ රථයේ ගැටලුව විස්තර කරන්න (සිංහල)...';
    if (language === 'ta') return 'உங்கள் வாகனப் பிரச்சினையை விවரிக்கவும் (தமிழ்)...';
    return `Describe symptoms for ${activeVehicle.brand} ${activeVehicle.modelName || ''} (e.g. engine knocking, brake squeal)...`;
  };

  return (
    <div className="container" style={{ maxWidth: '1000px' }}>
      
      {/* Header Bar */}
      <div className="diagnosis-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Sparkles color="var(--accent-orange)" size={24} />
            AI Vehicle Diagnostics
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Smart vehicle issue identification in English, Sinhala, and Tamil
          </p>
        </div>

        {/* Language Selector Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', padding: '0.5rem 0.9rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
          <Languages size={18} color="var(--primary-blue-mid)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Language:</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{ border: 'none', background: 'transparent', fontWeight: 700, color: 'var(--primary-blue)', cursor: 'pointer', outline: 'none' }}
          >
            <option value="en">English</option>
            <option value="si">Sinhala (සිංහල)</option>
            <option value="ta">Tamil (தமிழ்)</option>
          </select>
        </div>
      </div>

      {/* Quick Action Button: Show Nearby Garages */}
      <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
        <button
          className="btn btn-sm btn-outline"
          onClick={handleShowNearbyGarages}
          style={{ background: 'white', borderColor: 'var(--primary-blue-mid)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <MapPin size={16} color="var(--accent-orange)" />
          <span>Show nearby garages</span>
        </button>
      </div>

      {/* 1. Gated state: User not logged in */}
      {!user && (
        <div className="card" style={{ padding: '1.4rem 1.6rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '16px', marginBottom: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', minWidth: 0 }}>
            <div style={{ padding: '0.6rem', background: '#dbeafe', borderRadius: '12px', color: '#1d4ed8', flexShrink: 0 }}>
              <ShieldAlert size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-blue)', margin: 0 }}>
                Authentication Required
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
                Please log in with a registered vehicle to run AI diagnostics and receive tailored repair advice.
              </p>
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate('/login', { state: { returnTo: '/diagnosis' } })}
            style={{ gap: '0.4rem', borderRadius: '10px' }}
          >
            <LogIn size={16} />
            <span>Log In to Continue</span>
          </button>
        </div>
      )}

      {/* 2. Loading state: Vehicles fetching */}
      {user && vehiclesLoading && (
        <div style={{ padding: '0.9rem 1.2rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div className="spin" style={{ width: '16px', height: '16px', border: '2px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%' }} />
          <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Checking your registered vehicles...
          </span>
        </div>
      )}

      {/* 3. Empty state: Logged in, 0 vehicles */}
      {user && !vehiclesLoading && vehicles.length === 0 && (
        <div className="card" style={{ padding: '1.4rem 1.6rem', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '16px', marginBottom: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', minWidth: 0 }}>
            <div style={{ padding: '0.6rem', background: '#ffedd5', borderRadius: '12px', color: '#c2410c', flexShrink: 0 }}>
              <Car size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#9a3412', margin: 0 }}>
                Add a vehicle to start diagnosis
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#c2410c', margin: '0.2rem 0 0' }}>
                A registered vehicle is required so the AI can diagnose your exact brand, model, year, and fuel system.
              </p>
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate('/vehicles', { state: { returnTo: '/diagnosis' } })}
            style={{ gap: '0.4rem', borderRadius: '10px' }}
          >
            <Car size={16} />
            <span>Add Vehicle</span>
          </button>
        </div>
      )}

      {/* Main Chat Container */}
      <div
        className="card diagnosis-chat-card"
        style={{
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '600px',
          overflow: 'hidden',
          borderRadius: '20px',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-md)'
        }}
      >
        {/* Chat Top Header Bar */}
        <div
          className="diagnosis-chat-header"
          style={{
            background: 'linear-gradient(135deg, #0f172a, #1e3a8a)',
            color: 'white',
            padding: '1rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: '40px', height: '40px', background: 'var(--accent-orange)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={22} color="white" />
              </div>
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', background: '#22c55e', borderRadius: '50%', border: '2px solid white' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="diagnosis-chat-title" style={{ fontWeight: 700, fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>AI Garage Diagnostic Assistant</div>
              <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>Online • Multi-lingual Vehicle Care</div>
            </div>
          </div>
        </div>

        {/* Active Vehicle Details Sub-Banner */}
        {activeVehicle && (
          <div
            className="diagnosis-vehicle-banner"
            style={{
              background: '#f8fafc',
              borderBottom: '1px solid var(--border-color)',
              padding: '0.75rem 1.2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.6rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', minWidth: 0 }}>
              <Car size={18} color="var(--primary-blue-mid)" style={{ flexShrink: 0 }} />
              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--primary-blue)' }}>
                {activeVehicle.brand} {activeVehicle.modelName || ''} {activeVehicle.year ? `(${activeVehicle.year})` : ''}
              </span>
              <span className="badge badge-orange" style={{ fontSize: '0.72rem', padding: '0.15rem 0.55rem' }}>
                {activeVehicle.fuelType || 'Petrol'}
              </span>
              <span className="badge badge-blue" style={{ fontSize: '0.72rem', padding: '0.15rem 0.55rem' }}>
                {activeVehicle.vehicleType || 'Vehicle'}
              </span>
              {vehicles.length === 1 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  (Auto-selected)
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              {vehicles.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Switch:</span>
                  <select
                    value={selectedVehicleId || ''}
                    disabled={isSubmitting}
                    onChange={(e) => handleVehicleChange(e.target.value)}
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      padding: '0.25rem 0.6rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'white',
                      color: 'var(--primary-blue)',
                      cursor: 'pointer'
                    }}
                  >
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.brand} {v.modelName || ''} {v.year ? `(${v.year})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={handleNewDiagnosis}
                disabled={isSubmitting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--primary-blue)',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  boxShadow: 'var(--shadow-sm)'
                }}
                title="Start a new issue for this vehicle (isolates context while preserving history)"
              >
                <Sparkles size={14} color="var(--accent-orange)" />
                <span>New Diagnosis</span>
              </button>
            </div>
          </div>
        )}

        {/* Multiple vehicles unselected prompt banner */}
        {user && !vehiclesLoading && vehicles.length > 1 && !activeVehicle && (
          <div
            style={{
              background: '#eff6ff',
              borderBottom: '1px solid #bfdbfe',
              padding: '0.75rem 1.2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.6rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Car size={18} color="#1d4ed8" />
              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e40af' }}>
                Select a vehicle to begin diagnosis:
              </span>
            </div>
            <select
              value=""
              onChange={(e) => handleVehicleChange(e.target.value)}
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                padding: '0.3rem 0.7rem',
                borderRadius: '8px',
                border: '1px solid #93c5fd',
                background: 'white',
                color: '#1e3a8a',
                cursor: 'pointer'
              }}
            >
              <option value="" disabled>-- Choose vehicle --</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.brand} {v.modelName || ''} {v.year ? `(${v.year})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Messages Scroll Area */}
        <div
          className="diagnosis-messages-container"
          style={{
            flex: 1,
            padding: '1.5rem',
            overflowY: 'auto',
            background: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.2rem'
          }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`diagnosis-message-row ${msg.sender === 'user' ? 'user-row' : 'ai-row'}`}
              style={{
                display: 'flex',
                justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                alignItems: 'flex-start',
                gap: '0.6rem'
              }}
            >
              {/* AI Avatar */}
              {msg.sender === 'ai' && (
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--accent-orange)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                  <Bot size={18} />
                </div>
              )}

              {/* Chat Bubble */}
              <div
                className="diagnosis-bubble"
                style={{
                  maxWidth: '75%',
                  background: msg.sender === 'user'
                    ? 'linear-gradient(135deg, var(--primary-blue-mid), var(--primary-blue))'
                    : msg.isError
                    ? '#fef2f2'
                    : '#ffffff',
                  color: msg.sender === 'user' ? 'white' : msg.isError ? '#991b1b' : 'var(--text-main)',
                  padding: '0.9rem 1.2rem',
                  borderRadius: msg.sender === 'user' ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  border: msg.sender === 'ai' ? (msg.isError ? '1px solid #fecaca' : '1px solid var(--border-color)') : 'none',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.55',
                  fontSize: '0.95rem',
                  position: 'relative'
                }}
              >
                {msg.text}

                {/* Structured Diagnostic Assessment Details (rendered when responseType === 'DIAGNOSIS') */}
                {msg.diagnosisData?.responseType === 'DIAGNOSIS' && (
                  <div
                    style={{
                      marginTop: '0.85rem',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.55rem',
                      fontSize: '0.88rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 800, color: 'var(--primary-blue)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        📋 Diagnostic Assessment
                      </span>
                      {msg.diagnosisData.confidence != null && (
                        <span style={{ fontSize: '0.75rem', color: '#0369a1', background: '#e0f2fe', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 700 }} title="AI self-reported confidence heuristic (model uncertainty estimate, not a Naive Bayes class probability or certified accuracy)">
                          AI self-estimate: {Math.round(msg.diagnosisData.confidence * 100)}%
                        </span>
                      )}
                    </div>

                    {msg.diagnosisData.faultName && (
                      <div>
                        <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Identified Fault: </span>
                        <span style={{ fontWeight: 800, color: '#1e3a8a' }}>{msg.diagnosisData.faultName}</span>
                      </div>
                    )}

                    {msg.diagnosisData.possibleCause && (
                      <div>
                        <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Possible Cause: </span>
                        <span style={{ color: 'var(--text-main)' }}>{msg.diagnosisData.possibleCause}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Driveability: </span>
                      {msg.diagnosisData.safeToDrive === true ? (
                        <span className="badge badge-green" style={{ fontSize: '0.75rem' }}>Safe to drive with caution</span>
                      ) : msg.diagnosisData.safeToDrive === false ? (
                        <span className="badge badge-red" style={{ fontSize: '0.75rem', background: '#fee2e2', color: '#991b1b' }}>⚠️ Unsafe — Towing or immediate inspection advised</span>
                      ) : (
                        <span className="badge" style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#475569' }}>Safety unknown — get a mechanic assessment</span>
                      )}
                    </div>

                    {/* Repair Cost Estimate */}
                    {(() => {
                      const ce = msg.diagnosisData.costEstimate;
                      if (!ce || ce.source === 'UNAVAILABLE') {
                        return (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            💰 Repair Cost: <span style={{ fontStyle: 'italic' }}>Estimate unavailable — requires physical inspection</span>
                          </div>
                        );
                      }
                      const isRef = ce.source === 'ILLUSTRATIVE_BENCHMARK' || ce.source === 'REFERENCE_BENCHMARK';
                      return (
                        <div style={{ fontSize: '0.8rem' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>💰 Repair Cost (LKR): </span>
                          <span style={{ fontWeight: 800, color: isRef ? '#065f46' : '#92400e' }}>
                            {ce.displayLabel || `LKR ${ce.minCost?.toLocaleString()} – ${ce.maxCost?.toLocaleString()}`}
                          </span>
                          <span
                            style={{
                              marginLeft: '0.4rem',
                              fontSize: '0.72rem',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '999px',
                              background: isRef ? '#d1fae5' : '#fef3c7',
                              color: isRef ? '#065f46' : '#92400e',
                              fontWeight: 700
                            }}
                            title={isRef
                              ? 'Illustrative prototype reference range for standard Sri Lankan workshop repairs (unverified field estimate). Verify with a local garage before making repair decisions.'
                              : 'AI-generated rough estimate — verify with a garage before decisions'
                            }
                          >
                            {isRef ? 'Illustrative Ref' : 'AI Estimate'}
                          </span>
                          {ce.assumptions && (
                            <div style={{ marginTop: '0.15rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              {ce.assumptions}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <div style={{ marginTop: '0.3rem', paddingTop: '0.4rem', borderTop: '1px solid #e2e8f0' }}>
                      <button
                        type="button"
                        onClick={handleShowNearbyGarages}
                        className="btn btn-primary btn-sm"
                        style={{ width: '100%', justifyContent: 'center', fontSize: '0.82rem', gap: '0.4rem' }}
                      >
                        <Wrench size={14} />
                        <span>Find Nearby Workshops for this Issue</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Optional interactive suggestion chip */}
                {msg.suggestion && (
                  <div style={{ marginTop: '0.65rem' }}>
                    <button
                      type="button"
                      className="diagnosis-suggestion-btn"
                      disabled={!isDiagnosisAllowed}
                      onClick={() => isDiagnosisAllowed && setInputText(msg.suggestion)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: '999px',
                        padding: '0.35rem 0.85rem',
                        color: 'var(--primary-blue-mid)',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: isDiagnosisAllowed ? 'pointer' : 'not-allowed',
                        opacity: isDiagnosisAllowed ? 1 : 0.6,
                        transition: 'all 0.2s'
                      }}
                      title={isDiagnosisAllowed ? "Click to paste into diagnosis input" : "Select a vehicle to use suggestions"}
                    >
                      <span>💡 Try this:</span>
                      <span style={{ fontStyle: 'italic' }}>"{msg.suggestion}"</span>
                    </button>
                  </div>
                )}

                {/* Retry action if previous attempt failed */}
                {msg.isError && msg.retryText && (
                  <div style={{ marginTop: '0.65rem' }}>
                    <button
                      type="button"
                      onClick={() => handleSendMessage(null, msg.retryText)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: '#fee2e2',
                        border: '1px solid #fca5a5',
                        borderRadius: '999px',
                        padding: '0.35rem 0.85rem',
                        color: '#b91c1c',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      title="Retry sending this symptom to AI"
                    >
                      <span>🔄 Tap to Retry Diagnosis</span>
                    </button>
                  </div>
                )}

                {/* Footer of Bubble: Timestamp + Speaker button for AI responses */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: msg.sender === 'ai' ? 'space-between' : 'flex-end',
                    marginTop: '0.5rem',
                    paddingTop: '0.3rem',
                    borderTop: msg.sender === 'ai' ? '1px solid #f1f5f9' : 'none'
                  }}
                >
                  {/* Speaker Button for SpeechSynthesis API */}
                  {msg.sender === 'ai' && (
                    <button
                      onClick={() => handleReadAloud(msg.id, msg.text)}
                      style={{
                        background: speakingMessageId === msg.id ? '#ffedd5' : 'transparent',
                        border: 'none',
                        color: speakingMessageId === msg.id ? 'var(--accent-orange)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.4rem',
                        borderRadius: '6px',
                        transition: 'all 0.2s'
                      }}
                      title="Read response aloud (Text-to-Speech)"
                    >
                      {speakingMessageId === msg.id ? <VolumeX size={14} /> : <Volume2 size={14} />}
                      <span>{speakingMessageId === msg.id ? 'Stop' : 'Listen'}</span>
                    </button>
                  )}

                  {/* Timestamp */}
                  <span
                    style={{
                      fontSize: '0.7rem',
                      opacity: 0.75,
                      color: msg.sender === 'user' ? '#e0f2fe' : '#94a3b8'
                    }}
                  >
                    {msg.time}
                  </span>
                </div>
              </div>

              {/* User Avatar */}
              {msg.sender === 'user' && (
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#0f172a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                  <User size={18} />
                </div>
              )}
            </div>
          ))}
          {/* Scroll anchor */}
          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar Form */}
        <form
          className="diagnosis-input-form"
          onSubmit={handleSendMessage}
          style={{
            padding: '1rem 1.2rem',
            background: 'white',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          {/* Microphone Button (SpeechRecognition API) */}
          <button
            type="button"
            className={`btn btn-sm diagnosis-input-btn ${isRecording ? 'mic-recording' : ''}`}
            onClick={toggleSpeechRecognition}
            disabled={!isDiagnosisAllowed || isSubmitting}
            style={{
              background: isRecording ? '#ef4444' : '#fff7ed',
              color: isRecording ? 'white' : 'var(--accent-orange)',
              border: '1px solid var(--accent-orange)',
              borderRadius: '50%',
              width: '46px',
              height: '46px',
              padding: 0,
              flexShrink: 0,
              cursor: isDiagnosisAllowed ? 'pointer' : 'not-allowed',
              opacity: isDiagnosisAllowed ? 1 : 0.5
            }}
            title={isDiagnosisAllowed ? "Click to speak (Voice Recognition API)" : "Select a vehicle to use voice input"}
          >
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Text Input Field */}
          <input
            type="text"
            className="form-input"
            disabled={!isDiagnosisAllowed || isSubmitting}
            style={{
              borderRadius: '25px',
              paddingLeft: '1.2rem',
              backgroundColor: isDiagnosisAllowed ? '#f8fafc' : '#f1f5f9',
              cursor: isDiagnosisAllowed ? 'text' : 'not-allowed'
            }}
            placeholder={getInputPlaceholder()}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />

          {/* Send Button */}
          <button
            type="submit"
            className="btn btn-primary diagnosis-input-btn"
            disabled={!isDiagnosisAllowed || isSubmitting || !inputText.trim()}
            style={{
              borderRadius: '50%',
              width: '46px',
              height: '46px',
              padding: 0,
              flexShrink: 0,
              opacity: (isDiagnosisAllowed && !isSubmitting && inputText.trim()) ? 1 : 0.5,
              cursor: (isDiagnosisAllowed && !isSubmitting && inputText.trim()) ? 'pointer' : 'not-allowed'
            }}
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};
