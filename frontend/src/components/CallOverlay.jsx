import { useEffect, useRef } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, PhoneCall } from 'lucide-react';
import { getAvatarGradient, getInitial } from '../utils/avatar';
import { useTheme } from '../context/ThemeContext';

function formatDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function CallOverlay({
  callState, peerUsername, callType, localStream, remoteStream,
  micOn, camOn, peerMicOn, peerCamOn, duration,
  onAccept, onReject, onCancel, onEnd, onToggleMic, onToggleCam
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream || null;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream || null;
  }, [remoteStream]);

  if (callState === 'idle') return null;

  const isVideo = callType === 'video';

  return (
    <div
      className="modal-overlay-anim"
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: isVideo && callState === 'active' ? '#000' : (isDark ? '#0a0a0aee' : '#111827ee'),
        backdropFilter: 'blur(6px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        color: '#fff'
      }}
    >
      {/* Remote + local video elements always mounted once we have a call, hidden for audio calls */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        style={{
          display: isVideo && callState === 'active' ? 'block' : 'none',
          position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover'
        }}
      />
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        style={{
          display: isVideo && callState === 'active' && camOn ? 'block' : 'none',
          position: 'absolute', bottom: 110, right: 24, width: 130, height: 174,
          borderRadius: 14, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.25)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 2
        }}
      />

      {/* ===== INCOMING ===== */}
      {callState === 'incoming' && (
        <div className="pop-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 3 }}>
          <div className="pulse-online" style={{
            width: 96, height: 96, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 34, fontWeight: 600, background: getAvatarGradient(peerUsername), marginBottom: 8
          }}>
            {getInitial(peerUsername)}
          </div>
          <p style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{peerUsername}</p>
          <p style={{ fontSize: 14, color: '#aaa', margin: '2px 0 30px', display: 'flex', alignItems: 'center', gap: 6 }}>
            {isVideo ? <Video size={14} /> : <Phone size={14} />}
            {isVideo ? 'Video qo\'ng\'iroq...' : 'Kiruvchi qo\'ng\'iroq...'}
          </p>
          <div style={{ display: 'flex', gap: 40 }}>
            <button onClick={onReject} className="scale-tap" style={btnStyle('#ef4444')}>
              <PhoneOff size={24} color="white" />
            </button>
            <button onClick={onAccept} className="scale-tap" style={btnStyle('#22c55e')}>
              <PhoneCall size={24} color="white" />
            </button>
          </div>
        </div>
      )}

      {/* ===== OUTGOING ===== */}
      {callState === 'outgoing' && (
        <div className="pop-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 3 }}>
          <div style={{
            width: 96, height: 96, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 34, fontWeight: 600, background: getAvatarGradient(peerUsername), marginBottom: 8
          }}>
            {getInitial(peerUsername)}
          </div>
          <p style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{peerUsername}</p>
          <p style={{ fontSize: 14, color: '#aaa', margin: '2px 0 30px' }}>Chaqirilmoqda...</p>
          <button onClick={onCancel} className="scale-tap" style={btnStyle('#ef4444')}>
            <PhoneOff size={24} color="white" />
          </button>
        </div>
      )}

      {/* ===== ACTIVE ===== */}
      {callState === 'active' && (
        <>
          {(!isVideo || !remoteStream) && (
            <div className="pop-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 3 }}>
              <div style={{
                width: 110, height: 110, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 38, fontWeight: 600, background: getAvatarGradient(peerUsername), marginBottom: 10,
                position: 'relative'
              }}>
                {getInitial(peerUsername)}
                {!peerMicOn && (
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #111' }}>
                    <MicOff size={14} color="white" />
                  </div>
                )}
              </div>
              <p style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{peerUsername}</p>
              <p style={{ fontSize: 14, color: '#aaa', margin: '2px 0 0' }}>
                {isVideo ? 'Video ulanmoqda...' : formatDuration(duration)}
              </p>
            </div>
          )}

          {isVideo && remoteStream && (
            <div style={{ position: 'absolute', top: 24, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 3 }}>
              <p style={{ fontSize: 15, fontWeight: 600, margin: 0, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>{peerUsername}</p>
              <p style={{ fontSize: 12, color: '#ddd', margin: '2px 0 0', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>{formatDuration(duration)}</p>
              {!peerCamOn && <p style={{ fontSize: 12, color: '#f59e0b', margin: '4px 0 0' }}>Kamerasi o'chirilgan</p>}
            </div>
          )}

          <div style={{ position: 'absolute', bottom: 34, display: 'flex', gap: 22, zIndex: 3 }}>
            <button onClick={onToggleMic} className="scale-tap" style={btnStyle(micOn ? 'rgba(255,255,255,0.15)' : '#ef4444', 56)}>
              {micOn ? <Mic size={22} color="white" /> : <MicOff size={22} color="white" />}
            </button>
            {isVideo && (
              <button onClick={onToggleCam} className="scale-tap" style={btnStyle(camOn ? 'rgba(255,255,255,0.15)' : '#ef4444', 56)}>
                {camOn ? <Video size={22} color="white" /> : <VideoOff size={22} color="white" />}
              </button>
            )}
            <button onClick={onEnd} className="scale-tap" style={btnStyle('#ef4444', 56)}>
              <PhoneOff size={22} color="white" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function btnStyle(bg, size = 64) {
  return {
    width: size, height: size, borderRadius: '50%', border: 'none', background: bg,
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    boxShadow: '0 8px 20px rgba(0,0,0,0.3)'
  };
}
