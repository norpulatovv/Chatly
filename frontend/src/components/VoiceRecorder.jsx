import { useState, useRef } from 'react';
import { Mic, Square, Send, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function VoiceRecorder({ onSend, onCancel }) {
  const { showToast } = useToast();
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (voiceError) {
      console.error(voiceError);
      showToast("Mikrofonga ruxsat berilmagan", 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRef.current) mediaRef.current.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  };

  const handleSend = () => {
    if (audioBlob) onSend(audioBlob);
  };

  const handleCancel = () => {
    if (recording) stopRecording();
    setAudioBlob(null);
    setAudioUrl(null);
    setSeconds(0);
    onCancel();
  };

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
      <button onClick={handleCancel} className="icon-btn scale-tap" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>
        <X size={18} />
      </button>

      {!audioBlob ? (
        <>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
            {recording && (
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }} />
            )}
            <p style={{ color: recording ? '#ef4444' : '#888', fontSize: 14, margin: 0 }}>
              {recording ? formatTime(seconds) : 'Mikrofon tugmasini bosing'}
            </p>
          </div>
          {recording ? (
            <button onClick={stopRecording} className="scale-tap" style={{ width: 36, height: 36, borderRadius: '50%', background: '#ef4444', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Square size={14} color="white" />
            </button>
          ) : (
            <button onClick={startRecording} className="scale-tap pop-in" style={{ width: 36, height: 36, borderRadius: '50%', background: '#6366f1', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Mic size={16} color="white" />
            </button>
          )}
        </>
      ) : (
        <>
          <audio src={audioUrl} controls style={{ flex: 1, height: 32 }} />
          <button onClick={handleSend} className="scale-tap pop-in" style={{ width: 36, height: 36, borderRadius: '50%', background: '#22c55e', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Send size={16} color="white" />
          </button>
        </>
      )}
    </div>
  );
}