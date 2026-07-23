import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useSocket } from './SocketContext';
import { useToast } from './ToastContext';
import { startIncomingRingtone, startOutgoingRingtone, stopRingtone } from '../utils/sound';
import CallOverlay from '../components/CallOverlay';

const CallContext = createContext();

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

function getMyUsername() {
  return localStorage.getItem('username') || '';
}

export function CallProvider({ children }) {
  const { socket } = useSocket();
  const { showToast } = useToast();

  const [callState, setCallState] = useState('idle'); // idle | outgoing | incoming | active
  const [peerUsername, setPeerUsername] = useState('');
  const [callType, setCallType] = useState('audio'); // audio | video
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [peerMicOn, setPeerMicOn] = useState(true);
  const [peerCamOn, setPeerCamOn] = useState(true);
  const [duration, setDuration] = useState(0);

  const callStateRef = useRef('idle');
  const peerRef = useRef('');
  const callTypeRef = useRef('audio');
  const conversationIdRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const iceQueueRef = useRef([]);
  const durationTimerRef = useRef(null);

  const setCallStateBoth = (value) => { callStateRef.current = value; setCallState(value); };
  const setPeerBoth = (value) => { peerRef.current = value; setPeerUsername(value); };
  const setCallTypeBoth = (value) => { callTypeRef.current = value; setCallType(value); };

  const stopDurationTimer = () => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  };

  const startDurationTimer = () => {
    stopDurationTimer();
    durationTimerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
  };

  const cleanup = () => {
    stopRingtone();
    stopDurationTimer();
    if (pcRef.current) {
      try { pcRef.current.close(); } catch { /* ignore */ }
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    iceQueueRef.current = [];
    conversationIdRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setCallStateBoth('idle');
    setPeerBoth('');
    setMicOn(true);
    setCamOn(true);
    setPeerMicOn(true);
    setPeerCamOn(true);
    setDuration(0);
  };

  const endCallRef = useRef(() => {});

  const createPeerConnection = (targetUsername) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('call:ice-candidate', { to: targetUsername, from: getMyUsername(), candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      setRemoteStream(e.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      if ((pc.connectionState === 'failed' || pc.connectionState === 'disconnected') && callStateRef.current === 'active') {
        showToast('Ulanish uzildi', 'error');
        endCallRef.current();
      }
    };

    return pc;
  };

  const flushIceQueue = async () => {
    const pc = pcRef.current;
    if (!pc) return;
    const queued = iceQueueRef.current;
    iceQueueRef.current = [];
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        /* ignore stale candidate */
      }
    }
  };

  const startCall = async (targetUsername, type, conversationId) => {
    if (callStateRef.current !== 'idle') {
      showToast("Avval joriy qo'ng'iroqni tugating", 'error');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video' ? { width: 640, height: 480 } : false
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setPeerBoth(targetUsername);
      setCallTypeBoth(type);
      conversationIdRef.current = conversationId || null;
      setCallStateBoth('outgoing');
      startOutgoingRingtone();
      socket.emit('call:invite', { to: targetUsername, from: getMyUsername(), callType: type, conversationId });
    } catch (mediaErr) {
      console.error(mediaErr);
      showToast('Mikrofon/kameraga ruxsat berilmadi', 'error');
    }
  };

  const cancelCall = () => {
    if (callStateRef.current === 'outgoing') {
      socket.emit('call:cancel', { to: peerRef.current, from: getMyUsername() });
    }
    cleanup();
  };

  const acceptCall = async () => {
    if (callStateRef.current !== 'incoming') return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callTypeRef.current === 'video' ? { width: 640, height: 480 } : false
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      stopRingtone();

      const pc = createPeerConnection(peerRef.current);
      pcRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      setCallStateBoth('active');
      startDurationTimer();
      socket.emit('call:accept', { to: peerRef.current, from: getMyUsername() });
    } catch (mediaErr) {
      console.error(mediaErr);
      showToast('Mikrofon/kameraga ruxsat berilmadi', 'error');
      socket.emit('call:reject', { to: peerRef.current, from: getMyUsername(), reason: 'media-denied' });
      cleanup();
    }
  };

  const rejectCall = () => {
    if (callStateRef.current === 'incoming') {
      socket.emit('call:reject', { to: peerRef.current, from: getMyUsername(), reason: 'declined' });
    }
    cleanup();
  };

  const endCall = () => {
    if (callStateRef.current !== 'idle' && peerRef.current) {
      socket.emit('call:end', { to: peerRef.current, from: getMyUsername() });
    }
    cleanup();
  };

  useEffect(() => { endCallRef.current = endCall; });

  const toggleMic = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
    socket.emit('call:toggle-media', { to: peerRef.current, from: getMyUsername(), kind: 'audio', enabled: track.enabled });
  };

  const toggleCam = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
    socket.emit('call:toggle-media', { to: peerRef.current, from: getMyUsername(), kind: 'video', enabled: track.enabled });
  };

  useEffect(() => {
    if (!socket) return undefined;

    const onIncoming = ({ from, callType: type, conversationId }) => {
      if (callStateRef.current !== 'idle') {
        socket.emit('call:reject', { to: from, from: getMyUsername(), reason: 'busy' });
        return;
      }
      setPeerBoth(from);
      setCallTypeBoth(type || 'audio');
      conversationIdRef.current = conversationId || null;
      setCallStateBoth('incoming');
      startIncomingRingtone();
    };

    const onAccepted = async ({ from }) => {
      if (callStateRef.current !== 'outgoing' || from !== peerRef.current) return;
      stopRingtone();
      try {
        const pc = createPeerConnection(from);
        pcRef.current = pc;
        const stream = localStreamRef.current;
        if (stream) stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('call:offer', { to: from, from: getMyUsername(), sdp: offer });

        setCallStateBoth('active');
        startDurationTimer();
      } catch (offerErr) {
        console.error(offerErr);
        showToast("Qo'ng'iroqni ulashda xatolik", 'error');
        cleanup();
      }
    };

    const onRejected = ({ from, reason }) => {
      if (from !== peerRef.current) return;
      showToast(reason === 'busy' ? 'Foydalanuvchi band' : "Qo'ng'iroq rad etildi", 'info');
      cleanup();
    };

    const onCancelled = ({ from }) => {
      if (from !== peerRef.current) return;
      showToast("Qo'ng'iroq bekor qilindi", 'info');
      cleanup();
    };

    const onOffer = async ({ from, sdp }) => {
      const pc = pcRef.current;
      if (!pc || from !== peerRef.current) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        await flushIceQueue();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('call:answer', { to: from, from: getMyUsername(), sdp: answer });
      } catch (err) {
        console.error(err);
      }
    };

    const onAnswer = async ({ from, sdp }) => {
      const pc = pcRef.current;
      if (!pc || from !== peerRef.current) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        await flushIceQueue();
      } catch (err) {
        console.error(err);
      }
    };

    const onIceCandidate = async ({ from, candidate }) => {
      if (from !== peerRef.current || !candidate) return;
      const pc = pcRef.current;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(candidate);
        } catch {
          /* ignore */
        }
      } else {
        iceQueueRef.current.push(candidate);
      }
    };

    const onEnded = ({ from }) => {
      if (from !== peerRef.current) return;
      showToast("Qo'ng'iroq tugadi", 'info');
      cleanup();
    };

    const onUnavailable = () => {
      showToast('Foydalanuvchi oflayn', 'error');
      cleanup();
    };

    const onPeerToggleMedia = ({ from, kind, enabled }) => {
      if (from !== peerRef.current) return;
      if (kind === 'audio') setPeerMicOn(enabled);
      if (kind === 'video') setPeerCamOn(enabled);
    };

    socket.on('call:incoming', onIncoming);
    socket.on('call:accepted', onAccepted);
    socket.on('call:rejected', onRejected);
    socket.on('call:cancelled', onCancelled);
    socket.on('call:offer', onOffer);
    socket.on('call:answer', onAnswer);
    socket.on('call:ice-candidate', onIceCandidate);
    socket.on('call:ended', onEnded);
    socket.on('call:unavailable', onUnavailable);
    socket.on('call:peer-toggle-media', onPeerToggleMedia);

    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:accepted', onAccepted);
      socket.off('call:rejected', onRejected);
      socket.off('call:cancelled', onCancelled);
      socket.off('call:offer', onOffer);
      socket.off('call:answer', onAnswer);
      socket.off('call:ice-candidate', onIceCandidate);
      socket.off('call:ended', onEnded);
      socket.off('call:unavailable', onUnavailable);
      socket.off('call:peer-toggle-media', onPeerToggleMedia);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  return (
    <CallContext.Provider value={{ callState, peerUsername, callType, startCall }}>
      {children}
      <CallOverlay
        callState={callState}
        peerUsername={peerUsername}
        callType={callType}
        localStream={localStream}
        remoteStream={remoteStream}
        micOn={micOn}
        camOn={camOn}
        peerMicOn={peerMicOn}
        peerCamOn={peerCamOn}
        duration={duration}
        onAccept={acceptCall}
        onReject={rejectCall}
        onCancel={cancelCall}
        onEnd={endCall}
        onToggleMic={toggleMic}
        onToggleCam={toggleCam}
      />
    </CallContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCall() {
  return useContext(CallContext);
}
