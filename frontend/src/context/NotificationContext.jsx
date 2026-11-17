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

  const handlePromptClose = (confirmed) => {
    if (promptResolveRef.current) {
      promptResolveRef.current(confirmed ? promptValue : null);
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

  // ESC closes dialogs
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (confirmDialog) handleConfirmClose(false);
        if (promptDialog) handlePromptClose(false);
        if (alertDialog) handleAlertClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmDialog, promptDialog, alertDialog]);

  // Window bridge for native alert replacement
  useEffect(() => {
    window.workpulseToast = toast;
    window.workpulseConfirm = confirm;
    window.workpulsePrompt = prompt;
    window.workpulseAlert = alertModal;

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

      {/* Floating Modern Monochrome Toasts Container */}
      <div className="fixed top-4 right-4 left-4 sm:left-auto sm:top-5 sm:right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-auto sm:w-full pointer-events-none">
        {toasts.map((t) => {
          const isSuccess = t.type === 'success';
          const isError = t.type === 'error';
          const isWarning = t.type === 'warning';

          return (
            <div
              key={t.id}
              className="pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-elevated border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 text-zinc-900 dark:text-zinc-100 backdrop-blur-md transition-all duration-200 animate-in slide-in-from-top-3 fade-in"
            >
              <div className="shrink-0 mt-0.5">
                {isSuccess && (
                  <div className="w-5 h-5 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                )}
                {isError && (
                  <div className="w-5 h-5 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center">
                    <AlertCircle className="w-3.5 h-3.5" />
                  </div>
                )}
                {isWarning && (
                  <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                )}
                {!isSuccess && !isError && !isWarning && (
                  <div className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
                    <Info className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                {t.title && (
                  <h4 className="text-xs font-bold tracking-tight uppercase text-zinc-950 dark:text-white mb-0.5">
                    {t.title}
                  </h4>
                )}
                <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300 leading-relaxed break-words">{t.message}</p>
              </div>

              <button
                onClick={() => removeToast(t.id)}
                className="shrink-0 p-1 text-zinc-400 hover:text-zinc-950 dark:hover:text-white rounded-md transition-colors cursor-pointer"
                aria-label="Dismiss toast"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Modern Confirmation Dialog Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-modal border border-zinc-200 dark:border-zinc-800 max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div
                className="p-3 rounded-xl shrink-0 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700"
              >
                {confirmDialog.type === 'danger' ? (
                  <Trash2 className="w-5 h-5" />
                ) : confirmDialog.type === 'warning' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <HelpCircle className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-zinc-950 dark:text-white tracking-tight">
                  {confirmDialog.title}
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  {confirmDialog.message}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => handleConfirmClose(false)}
                className="px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
              >
                {confirmDialog.cancelText}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmClose(true)}
                className="px-4 py-2 text-xs font-bold bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-950 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Prompt Input Dialog Modal */}
      {promptDialog && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handlePromptClose(true);
            }}
            className="bg-white dark:bg-zinc-900 rounded-2xl shadow-modal border border-zinc-200 dark:border-zinc-800 max-w-md w-full p-6 animate-in zoom-in-95 duration-150"
          >
            <h3 className="text-sm sm:text-base font-bold text-zinc-950 dark:text-white tracking-tight">
              {promptDialog.title}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
              {promptDialog.message}
            </p>

            <div className="mt-4">
              <textarea
                required
                rows={3}
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                placeholder={promptDialog.placeholder}
                className="w-full px-3 py-2 text-base sm:text-xs border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg outline-none focus:ring-1 focus:ring-zinc-950 dark:focus:ring-white"
                autoFocus
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => handlePromptClose(false)}
                className="px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
              >
                {promptDialog.cancelText}
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white dark:text-zinc-950 bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                {promptDialog.confirmText}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modern Alert Modal */}
      {alertDialog && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-modal border border-zinc-200 dark:border-zinc-800 max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-150">
            <div className="mx-auto w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700">
              <Info className="w-5 h-5" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-zinc-950 dark:text-white tracking-tight">
              {alertDialog.title}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
              {alertDialog.message}
            </p>
            <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={handleAlertClose}
                className="w-full py-2 px-4 bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-950 rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
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

export const useNotifications = useNotification;
export default NotificationContext;

