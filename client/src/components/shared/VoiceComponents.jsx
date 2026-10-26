import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * VoicePlayer — uses Web Speech API speechSynthesis
 * Props:
 *   text: string to speak
 *   autoPlay?: boolean (default false)
 *   label?: string shown on button
 */
export function VoicePlayer({ text, autoPlay = false, label = 'Listen' }) {
  const [status, setStatus] = useState('idle'); // idle | playing | paused
  const [supported, setSupported] = useState(true);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const utterRef = useRef(null);

  useEffect(() => {
    if (!window.speechSynthesis) { setSupported(false); return; }
    const load = () => {
      const v = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
      setVoices(v);
      if (v.length && !selectedVoice) setSelectedVoice(v[0].name);
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  const speak = useCallback(() => {
    if (!window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = rate;
    utter.pitch = pitch;
    if (selectedVoice) {
      const v = window.speechSynthesis.getVoices().find(v => v.name === selectedVoice);
      if (v) utter.voice = v;
    }
    utter.onstart = () => setStatus('playing');
    utter.onpause = () => setStatus('paused');
    utter.onresume = () => setStatus('playing');
    utter.onend = () => setStatus('idle');
    utter.onerror = () => setStatus('idle');
    utterRef.current = utter;
    window.speechSynthesis.speak(utter);
    setStatus('playing');
  }, [text, rate, pitch, selectedVoice]);

  const pause = () => { window.speechSynthesis.pause(); setStatus('paused'); };
  const resume = () => { window.speechSynthesis.resume(); setStatus('playing'); };
  const stop = () => { window.speechSynthesis.cancel(); setStatus('idle'); };

  useEffect(() => { if (autoPlay && text) speak(); }, [autoPlay]);

  if (!supported) return (
    <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '6px 0' }}>
      ⚠️ Speech synthesis not supported in this browser.
    </div>
  );

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', margin: '10px 0' }}>
      {/* Play/Pause/Stop buttons */}
      {status === 'idle' && (
        <button className="btn-primary-custom" style={{ fontSize: 12, padding: '6px 14px' }} onClick={speak}>
          🔊 {label}
        </button>
      )}
      {status === 'playing' && (
        <>
          <button className="btn-ghost" style={{ fontSize: 12, padding: '6px 14px' }} onClick={pause}>
            ⏸ Pause
          </button>
          <button className="btn-ghost" style={{ fontSize: 12, padding: '6px 14px', color: '#e74c3c' }} onClick={stop}>
            ⏹ Stop
          </button>
          <span style={{ fontSize: 11, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, background: 'var(--accent)', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1s infinite' }}></span>
            Speaking...
          </span>
        </>
      )}
      {status === 'paused' && (
        <>
          <button className="btn-primary-custom" style={{ fontSize: 12, padding: '6px 14px' }} onClick={resume}>
            ▶️ Resume
          </button>
          <button className="btn-ghost" style={{ fontSize: 12, padding: '6px 14px', color: '#e74c3c' }} onClick={stop}>
            ⏹ Stop
          </button>
        </>
      )}

      {/* Voice & speed controls */}
      {voices.length > 1 && (
        <select
          className="form-control-custom"
          style={{ fontSize: 11, padding: '4px 8px', maxWidth: 160, height: 'auto' }}
          value={selectedVoice || ''}
          onChange={e => setSelectedVoice(e.target.value)}
        >
          {voices.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
        </select>
      )}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
        <span>Speed:</span>
        {[0.75, 1, 1.25, 1.5].map(r => (
          <button key={r} onClick={() => setRate(r)}
            style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, cursor: 'pointer',
              background: rate === r ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
              color: rate === r ? '#fff' : 'var(--text-muted)', border: 'none' }}>
            {r}x
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * MicrophoneInput — speech-to-text input with typed fallback
 * Props:
 *   onResult: (text: string) => void
 *   placeholder?: string
 *   disabled?: boolean
 */
export function MicrophoneInput({ onResult, placeholder = 'Ask a question...', disabled = false }) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [typedInput, setTypedInput] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSupported(true);
      const rec = new SpeechRecognition();
      rec.lang = 'en-US';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        setTypedInput(transcript);
        onResult(transcript);
        setListening(false);
      };
      rec.onerror = () => setListening(false);
      rec.onend = () => setListening(false);
      recognitionRef.current = rec;
    }
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.start();
    setListening(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (typedInput.trim()) {
      onResult(typedInput.trim());
      setTypedInput('');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input
        className="form-control-custom"
        value={typedInput}
        onChange={e => setTypedInput(e.target.value)}
        placeholder={listening ? '🎙 Listening...' : placeholder}
        disabled={disabled || listening}
        style={{ flex: 1 }}
      />
      {supported && (
        <button
          type="button"
          onClick={startListening}
          disabled={listening || disabled}
          title="Click to speak"
          style={{
            padding: '10px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: listening ? 'rgba(231,76,60,0.2)' : 'rgba(74,144,217,0.15)',
            color: listening ? '#e74c3c' : 'var(--accent)',
            fontSize: 16, transition: 'all 0.2s',
          }}
        >
          {listening ? '⏹' : '🎙'}
        </button>
      )}
      <button type="submit" className="btn-primary-custom" disabled={disabled || !typedInput.trim()} style={{ padding: '10px 16px' }}>
        🚀
      </button>
    </form>
  );
}
