import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Mic, MicOff, Bot, User, MapPin, Sparkles, Languages, Volume2, VolumeX } from 'lucide-react';

/**
 * Modern AI Garage Assistant DiagnosisPage Component
 * Features:
 * - Multi-lingual support (English, Sinhala, Tamil)
 * - SpeechRecognition API for voice input via microphone
 * - SpeechSynthesis API for text-to-speech reading AI responses aloud
 * - Connects to backend API POST /api/diagnosis with local AI fallback
 * - Auto-scrolling to bottom on new messages
 * - Clean, beginner-friendly code structure
 */
export const DiagnosisPage = () => {
  const navigate = useNavigate();

  // Selected language state: 'en' | 'si' | 'ta'
  const [language, setLanguage] = useState('en');
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const chatBottomRef = useRef(null);

  // Initial chat history with sequential demo flow messages on page load
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'Hello! I am your AI Garage Assistant. How can I help diagnose your vehicle today?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
    {
      id: 2,
      sender: 'ai',
      text: 'Please describe symptoms like engine knocking, brake noise, or warning lights.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
    {
      id: 3,
      sender: 'ai',
      text: "For example: 'My car makes a rattling sound when I accelerate'.",
      suggestion: 'My car makes a rattling sound when I accelerate',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // Auto-scroll chat to bottom whenever messages list changes
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Microphone Voice Input Handler using browser SpeechRecognition API
   */
  const toggleSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      simulateSpeechInput();
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      // Set speech recognition language based on selected language
      if (language === 'si') recognition.lang = 'si-LK';
      else if (language === 'ta') recognition.lang = 'ta-LK';
      else recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsRecording(false);
      };

      recognition.onerror = () => {
        setIsRecording(false);
        simulateSpeechInput();
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch (err) {
      simulateSpeechInput();
    }
  };

  /**
   * Fallback speech input simulation when SpeechRecognition API is restricted/unavailable
   */
  const simulateSpeechInput = () => {
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      if (language === 'si') {
        setInputText('එන්ජිමෙන් අධික ශබ්දයක් සහ දුමාරයක් එනවා, මොකක්ද ගැටලුව?');
      } else if (language === 'ta') {
        setInputText('என்ஜினில் இருந்து சத்தம் வருகிறது, என்ன காரணம்?');
      } else {
        setInputText('Engine is knocking loud when accelerating and check engine light is glowing red.');
      }
    }, 1500);
  };

  /**
   * Speaker Button Handler: Read AI message text aloud using browser SpeechSynthesis API
   */
  const handleReadAloud = (msgId, text) => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.');
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
   * Fallback local AI response generator for multi-lingual symptoms
   */
  const generateFallbackAIResponse = (queryText) => {
    const query = queryText.toLowerCase();

    if (language === 'si' || query.includes('ශබ්දයක්') || query.includes('එන්ජිම')) {
      return 'එන්ජිමේ පලුදු වීමක් හෝ ටයිමින් බෙල්ට් (Timing Belt) ගැටලුවක් විය හැකිය. එන්ජින් ඔයිල් මට්ටම පරීක්ෂා කර වහාම ආසන්නතම ගරාජයකට පෙන්වන්න.';
    }

    if (language === 'ta' || query.includes('என்ஜின்') || query.includes('சத்தம்')) {
      return 'என்ஜினில் சத்தம் வருவது உதிரிபாக உடைகளாக இருக்கலாம். வாகனத்தை உடனடியாக நிறுத்தி அருகிலுள்ள பட்டறைக்கு (Garage) கொண்டு செல்லவும்.';
    }

    if (query.includes('brake') || query.includes('squeak') || query.includes('noise')) {
      return 'Squeaking or grinding brake noise typically indicates worn brake pads or warped brake rotors. We strongly advise inspecting pads to prevent brake disc damage.';
    }

    if (query.includes('battery') || query.includes('start') || query.includes('light')) {
      return 'If your engine struggles to turn over, your battery voltage may be low or terminal posts corroded. A quick battery check or jump-start at a nearby workshop is recommended.';
    }

    return `Based on your symptom description ("${queryText}"), this issue appears related to engine sensor misfires or fluid level drop. We recommend checking coolant/oil levels and getting an OBD-II computer diagnostic scan.`;
  };

  /**
   * Send user message to Backend API POST /api/diagnosis
   */
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || isSubmitting) return;

    const userMessageText = inputText.trim();

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

    try {
      // Connect to backend API endpoint POST /api/diagnosis
      const response = await fetch('/api/diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessageText,
          language: language
        })
      });

      if (response.ok) {
        const data = await response.json();
        replyText = data.diagnosis || data.reply || data.message || generateFallbackAIResponse(userMessageText);
      } else {
        replyText = generateFallbackAIResponse(userMessageText);
      }
    } catch (err) {
      // If backend API is offline or unreachable, fallback smoothly to local AI diagnosis
      replyText = generateFallbackAIResponse(userMessageText);
    } finally {
      const aiReply = {
        id: Date.now() + 1,
        sender: 'ai',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiReply]);
      setIsSubmitting(false);
    }
  };

  /**
   * Quick Action: Redirect to Garage Finder page
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
      text: 'I am redirecting you to the interactive Garage Finder map to view verified workshops near your location...',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg, aiMsg]);
    setTimeout(() => {
      navigate('/garages');
    }, 1200);
  };

  return (
    <div className="container" style={{ maxWidth: '1000px' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
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

      {/* Quick Action Button: Show Nearby Garages (NOTE: "Estimate repair cost" button removed as requested) */}
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
        {/* Chat Top Header Bar (NOTE: "Active: Toyota Corolla Axio" label removed as requested) */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: '40px', height: '40px', background: 'var(--accent-orange)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={22} color="white" />
              </div>
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', background: '#22c55e', borderRadius: '50%', border: '2px solid white' }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>AI Garage Diagnostic Assistant</div>
              <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>Online • Multi-lingual Vehicle Care</div>
            </div>
          </div>
        </div>

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
                    : '#ffffff',
                  color: msg.sender === 'user' ? 'white' : 'var(--text-main)',
                  padding: '0.9rem 1.2rem',
                  borderRadius: msg.sender === 'user' ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  border: msg.sender === 'ai' ? '1px solid var(--border-color)' : 'none',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.55',
                  fontSize: '0.95rem',
                  position: 'relative'
                }}
              >
                {msg.text}

                {/* Optional interactive suggestion chip */}
                {msg.suggestion && (
                  <div style={{ marginTop: '0.65rem' }}>
                    <button
                      type="button"
                      onClick={() => setInputText(msg.suggestion)}
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
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      title="Click to paste into diagnosis input"
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = '#dbeafe';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = '#eff6ff';
                      }}
                    >
                      <span>💡 Try this:</span>
                      <span style={{ fontStyle: 'italic' }}>"{msg.suggestion}"</span>
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
            className={`btn btn-sm ${isRecording ? 'mic-recording' : ''}`}
            onClick={toggleSpeechRecognition}
            style={{
              background: isRecording ? '#ef4444' : '#fff7ed',
              color: isRecording ? 'white' : 'var(--accent-orange)',
              border: '1px solid var(--accent-orange)',
              borderRadius: '50%',
              width: '46px',
              height: '46px',
              padding: 0,
              flexShrink: 0,
              cursor: 'pointer'
            }}
            title="Click to speak (Voice Recognition API)"
          >
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Text Input Field */}
          <input
            type="text"
            className="form-input"
            style={{ borderRadius: '25px', paddingLeft: '1.2rem', backgroundColor: '#f8fafc' }}
            placeholder={
              language === 'si'
                ? 'ඔබගේ රථයේ ගැටලුව විස්තර කරන්න (සිංහල)...'
                : language === 'ta'
                ? 'உங்கள் வாகனப் பிரச்சினையை விவரிக்கவும் (தமிழ்)...'
                : 'Describe symptoms (e.g. engine knocking, brake noise)...'
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />

          {/* Send Button */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting || !inputText.trim()}
            style={{ borderRadius: '50%', width: '46px', height: '46px', padding: 0, flexShrink: 0 }}
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};
