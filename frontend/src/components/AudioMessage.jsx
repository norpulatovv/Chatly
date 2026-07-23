import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

function formatTime(sec) {
  if (!isFinite(sec) || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function AudioMessage({ src, isOwn }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => setDuration(audio.duration || 0);
    const onTime = () => setCurrent(audio.currentTime);
    const onEnd = () => { setPlaying(false); setCurrent(0); };

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.pause();
    else audio.play();
    setPlaying(!playing);
  };

  const handleSeek = (e) => {
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const audio = audioRef.current;
    if (audio && duration) {
      audio.currentTime = ratio * duration;
      setCurrent(audio.currentTime);
    }
  };

  const progress = duration ? (current / duration) * 100 : 0;
  const fg = isOwn ? '#fff' : '#6366f1';
  const trackBg = isOwn ? 'rgba(255,255,255,0.3)' : 'rgba(99,102,241,0.2)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 200, padding: '4px 2px' }}>
      <audio ref={audioRef} src={src} preload="metadata" />

      <button
        onClick={togglePlay}
        className="scale-tap"
        style={{
          width: 34, height: 34, borderRadius: '50%', flexShrink: 0, border: 'none', cursor: 'pointer',
          background: isOwn ? 'rgba(255,255,255,0.2)' : 'rgba(99,102,241,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: fg
        }}
      >
        {playing ? <Pause size={15} fill={fg} /> : <Play size={15} fill={fg} style={{ marginLeft: 2 }} />}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          onClick={handleSeek}
          style={{ height: 4, borderRadius: 2, background: trackBg, cursor: 'pointer', position: 'relative' }}
        >
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${progress}%`, borderRadius: 2, background: fg, transition: 'width 0.1s linear' }} />
          <div style={{ position: 'absolute', left: `calc(${progress}% - 5px)`, top: -3, width: 10, height: 10, borderRadius: '50%', background: fg, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
        </div>
        <p style={{ fontSize: 11, margin: '4px 0 0', opacity: 0.75, color: 'inherit' }}>
          {formatTime(current)} / {formatTime(duration)}
        </p>
      </div>
    </div>
  );
}
