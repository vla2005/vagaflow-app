import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const toastConfig = {
  success: { icon: CheckCircle2, label: 'Sucesso' },
  info: { icon: Info, label: 'Informação' },
  error: { icon: CircleAlert, label: 'Erro' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(({ message, type = 'info', title, duration = 5000 }) => {
    if (!message) return null;

    const resolvedType = toastConfig[type] ? type : 'info';
    const id = ++nextId.current;
    const toast = {
      id,
      message,
      type: resolvedType,
      title: title || toastConfig[resolvedType].label,
    };

    setToasts((current) => [...current.slice(-3), toast]);

    if (duration > 0) {
      window.setTimeout(() => dismiss(id), duration);
    }

    return id;
  }, [dismiss]);

  const value = useMemo(() => ({
    showToast,
    dismiss,
    success: (message, options = {}) => showToast({ ...options, message, type: 'success' }),
    info: (message, options = {}) => showToast({ ...options, message, type: 'info' }),
    error: (message, options = {}) => showToast({ ...options, message, type: 'error' }),
  }), [dismiss, showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" aria-live="polite" aria-relevant="additions removals">
        {toasts.map((toast) => {
          const Icon = toastConfig[toast.type].icon;

          return (
            <div className={`toast toast-${toast.type}`} key={toast.id} role={toast.type === 'error' ? 'alert' : 'status'}>
              <span className="toast-icon" aria-hidden="true">
                <Icon size={21} strokeWidth={2} />
              </span>
              <div className="toast-content">
                <strong>{toast.title}</strong>
                <p>{toast.message}</p>
              </div>
              <button type="button" onClick={() => dismiss(toast.id)} aria-label="Fechar mensagem" title="Fechar">
                <X size={18} strokeWidth={2} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast deve ser usado dentro de ToastProvider.');
  }

  return context;
}
