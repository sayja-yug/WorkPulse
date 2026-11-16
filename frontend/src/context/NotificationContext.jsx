import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Trash2,
  HelpCircle,
} from 'lucide-react';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  // Toasts state
  const [toasts, setToasts] = useState([]);

  // Confirm modal state
  const [confirmDialog, setConfirmDialog] = useState(null);
  const confirmResolveRef = useRef(null);

  // Prompt modal state
  const [promptDialog, setPromptDialog] = useState(null);
  const [promptValue, setPromptValue] = useState('');
  const promptResolveRef = useRef(null);

  // Alert modal state
  const [alertDialog, setAlertDialog] = useState(null);
  const alertResolveRef = useRef(null);

  // Toast handler
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', title = '', duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 7);
    setToasts((prev) => [...prev, { id, message, type, title }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  const toast = {
    success: (msg, title = 'Success') => showToast(msg, 'success', title),
    error: (msg, title = 'Error') => showToast(msg, 'error', title, 5000),
    warning: (msg, title = 'Warning') => showToast(msg, 'warning', title),
    info: (msg, title = 'Notification') => showToast(msg, 'info', title),
  };

  // Modern Confirm Dialog
  const confirm = useCallback(({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger', // 'danger' | 'warning' | 'primary'
  }) => {
    return new Promise((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmDialog({
        title,
        message,
        confirmText,
        cancelText,
        type,
      });
    });
  }, []);

  const handleConfirmClose = (result) => {
    if (confirmResolveRef.current) {
      confirmResolveRef.current(result);
      confirmResolveRef.current = null;
    }
    setConfirmDialog(null);
  };

  // Modern Prompt Dialog
  const prompt = useCallback(({
    title = 'Input Required',
    message = 'Please provide details:',
    defaultValue = '',
    placeholder = 'Type here...',
    confirmText = 'Submit',
    cancelText = 'Cancel',
  }) => {
    return new Promise((resolve) => {
      promptResolveRef.current = resolve;
      setPromptValue(defaultValue);
      setPromptDialog({
        title,
        message,
        placeholder,
        confirmText,
        cancelText,
      });
    });
  }, []);

  const handlePromptClose = (submitted) => {
    if (promptResolveRef.current) {
      promptResolveRef.current(submitted ? promptValue : null);
      promptResolveRef.current = null;
    }
    setPromptDialog(null);
    setPromptValue('');
  };

  // Modern Alert Modal
  const alertModal = useCallback(({
    title = 'Notice',
    message = '',
    type = 'info',
    buttonText = 'Understood',
  }) => {
    return new Promise((resolve) => {
      alertResolveRef.current = resolve;
      setAlertDialog({
        title,
        message,
        type,
        buttonText,
      });
    });
  }, []);

  const handleAlertClose = () => {
    if (alertResolveRef.current) {
      alertResolveRef.current();
      alertResolveRef.current = null;
    }
    setAlertDialog(null);
  };

  // Window bridge so any legacy or third-party call gets caught smoothly
  useEffect(() => {
    window.workpulseToast = toast;
    window.workpulseConfirm = confirm;
    window.workpulsePrompt = prompt;
    window.workpulseAlert = alertModal;

    // Graceful native alert replacement to avoid "localhost:5173 says"
    const originalAlert = window.alert;
    window.alert = (msg) => {
      if (typeof msg === 'string') {
        const lower = msg.toLowerCase();
        if (lower.includes('success') || lower.includes('initiated') || lower.includes('approved') || lower.includes('disbursed') || lower.includes('removed')) {
          toast.success(msg);
        } else if (lower.includes('failed') || lower.includes('error') || lower.includes('required') || lower.includes('denied')) {
          toast.error(msg);
        } else if (lower.includes('warning') || lower.includes('check')) {
          toast.warning(msg);
        } else {
          toast.info(msg);
        }
      } else {
        toast.info(String(msg));
      }
    };

    return () => {
      window.alert = originalAlert;
    };
  }, [confirm, prompt, alertModal]);

  return (
    <NotificationContext.Provider
      value={{
        toast,
        showToast,
        confirm,
        prompt,
        alert: alertModal,
      }}
    >
      {children}

      {/* Floating Modern Toasts Container */}
      <div className="fixed top-4 right-4 left-4 sm:left-auto sm:top-5 sm:right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-auto sm:w-full pointer-events-none">
        {toasts.map((t) => {
          const isSuccess = t.type === 'success';
          const isError = t.type === 'error';
          const isWarning = t.type === 'warning';

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-xl border backdrop-blur-md transition-all duration-300 animate-in slide-in-from-top-3 fade-in ${
                isSuccess
                  ? 'bg-emerald-950/90 text-emerald-100 border-emerald-800/80 shadow-emerald-950/30'
                  : isError
                  ? 'bg-rose-950/90 text-rose-100 border-rose-800/80 shadow-rose-950/30'
                  : isWarning
                  ? 'bg-amber-950/90 text-amber-100 border-amber-800/80 shadow-amber-950/30'
                  : 'bg-slate-900/90 text-slate-100 border-slate-700/80 shadow-slate-950/30'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {isError && <AlertCircle className="w-5 h-5 text-rose-400" />}
                {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-indigo-400" />}
              </div>

              <div className="flex-1 min-w-0">
                {t.title && (
                  <h4 className="text-xs font-bold tracking-wide uppercase opacity-90 mb-0.5">
                    {t.title}
                  </h4>
                )}
                <p className="text-xs font-medium leading-relaxed break-words">{t.message}</p>
              </div>

              <button
                onClick={() => removeToast(t.id)}
                className="shrink-0 p-1 text-slate-400 hover:text-white rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Modern Confirmation Dialog Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div
                className={`p-3 rounded-2xl shrink-0 ${
                  confirmDialog.type === 'danger'
                    ? 'bg-rose-50 text-rose-600'
                    : confirmDialog.type === 'warning'
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-indigo-50 text-indigo-600'
                }`}
              >
                {confirmDialog.type === 'danger' ? (
                  <Trash2 className="w-6 h-6" />
                ) : confirmDialog.type === 'warning' ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <HelpCircle className="w-6 h-6" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  {confirmDialog.title}
                </h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {confirmDialog.message}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleConfirmClose(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                {confirmDialog.cancelText}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmClose(true)}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-sm transition-colors cursor-pointer ${
                  confirmDialog.type === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : confirmDialog.type === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Prompt Input Dialog Modal */}
      {promptDialog && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handlePromptClose(true);
            }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in zoom-in-95 duration-150"
          >
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              {promptDialog.title}
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              {promptDialog.message}
            </p>

            <div className="mt-4">
              <textarea
                required
                rows={3}
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                placeholder={promptDialog.placeholder}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                autoFocus
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handlePromptClose(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                {promptDialog.cancelText}
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                {promptDialog.confirmText}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modern Alert Modal */}
      {alertDialog && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-150">
            <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-3 bg-indigo-50 text-indigo-600">
              <Info className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              {alertDialog.title}
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              {alertDialog.message}
            </p>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleAlertClose}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                {alertDialog.buttonText}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

