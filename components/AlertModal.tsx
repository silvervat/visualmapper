
import React from 'react';
import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react';

export type AlertType = 'error' | 'warning' | 'success' | 'info';

interface AlertModalProps {
  isOpen: boolean;
  type: AlertType;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
}

const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  type,
  title,
  message,
  onClose,
  onConfirm,
  confirmText = 'OK',
  cancelText = 'Tuhista',
  showCancel = false
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'error':
        return <XCircle className="w-12 h-12 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-12 h-12 text-amber-500" />;
      case 'success':
        return <CheckCircle className="w-12 h-12 text-green-500" />;
      case 'info':
      default:
        return <Info className="w-12 h-12 text-blue-500" />;
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case 'error':
        return 'bg-red-600 hover:bg-red-700';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700';
      case 'success':
        return 'bg-green-600 hover:bg-green-700';
      case 'info':
      default:
        return 'bg-blue-600 hover:bg-blue-700';
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div className="p-6 pt-8">
          <div className="flex flex-col items-center text-center">
            {getIcon()}

            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              {title}
            </h3>

            <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">
              {message}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 bg-gray-50 border-t border-gray-100">
          {showCancel && (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            className={`flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-colors ${getButtonColor()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;


// Hook for easy alert management
export interface AlertState {
  isOpen: boolean;
  type: AlertType;
  title: string;
  message: string;
  onConfirm?: () => void;
  showCancel?: boolean;
}

export const useAlert = () => {
  const [alertState, setAlertState] = React.useState<AlertState>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  const showAlert = (options: Omit<AlertState, 'isOpen'>) => {
    setAlertState({ ...options, isOpen: true });
  };

  const hideAlert = () => {
    setAlertState(prev => ({ ...prev, isOpen: false }));
  };

  const showError = (title: string, message: string) => {
    showAlert({ type: 'error', title, message });
  };

  const showWarning = (title: string, message: string, onConfirm?: () => void) => {
    showAlert({ type: 'warning', title, message, onConfirm, showCancel: !!onConfirm });
  };

  const showSuccess = (title: string, message: string) => {
    showAlert({ type: 'success', title, message });
  };

  const showInfo = (title: string, message: string) => {
    showAlert({ type: 'info', title, message });
  };

  return {
    alertState,
    showAlert,
    hideAlert,
    showError,
    showWarning,
    showSuccess,
    showInfo
  };
};
