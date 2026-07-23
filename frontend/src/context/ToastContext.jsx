import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

const ToastContext = createContext();

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const showToast = useCallback((message, type = 'info') => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    timers.current[id] = setTimeout(() => remove(id), 3200);
  }, [remove]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: 'fixed', top: 18, left: '50%', zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', pointerEvents: 'none'
      }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              pointerEvents: 'auto',
              transform: 'translateX(-50%)',
              position: 'relative',
              left: 0,
              animation: 'toastIn 0.25s cubic-bezier(0.2,0.9,0.3,1.1) both',
              display: 'flex', alignItems: 'center', gap: 8,
              background: t.type === 'error' ? '#ef4444' : t.type === 'success' ? '#22c55e' : '#262626',
              color: '#fff', padding: '10px 16px', borderRadius: 12, fontSize: 13, fontWeight: 500,
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)', maxWidth: 340
            }}
            onClick={() => remove(t.id)}
          >
            {t.type === 'error' ? <XCircle size={16} /> : t.type === 'success' ? <CheckCircle2 size={16} /> : <Info size={16} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext);
}
