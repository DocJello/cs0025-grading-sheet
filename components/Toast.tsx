import React, { useEffect } from 'react';
import { ToastMessage } from '../types';
import { InfoIcon } from './Icons';

interface ToastProps {
    toast: ToastMessage;
    onDismiss: (id: number) => void;
}

// New component to format the message with colors
const FormattedToastMessage: React.FC<{ message: string }> = ({ message }) => {
    // Regex to capture panel names (e.g., "Panel 1") and group names in quotes (e.g., ""Group Name"")
    const regex = /(Panel\s\d+|"[^"]+")/g;
    const parts = message.split(regex);

    return (
        <>
            {parts.map((part, index) => {
                if (!part) return null;
                if (part.startsWith('Panel')) {
                    // Panel names are blue
                    return <strong key={index} className="font-semibold text-blue-600">{part}</strong>;
                }
                if (part.startsWith('"')) {
                    // Group names are green
                    return <strong key={index} className="font-semibold text-green-700">{part}</strong>;
                }
                // The rest of the text
                return <span key={index}>{part}</span>;
            })}
        </>
    );
};

const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(toast.id);
        }, 5000); // Auto-dismiss after 5 seconds

        return () => {
            clearTimeout(timer);
        };
    }, [toast.id, onDismiss]);

    return (
        <div 
            className="bg-white shadow-lg rounded-md pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden animate-fade-in-up"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
        >
            <div className="p-4">
                <div className="flex items-center">
                    <div className="flex-shrink-0">
                        <InfoIcon className="h-6 w-6 text-green-500" />
                    </div>
                    <div className="ml-3 w-0 flex-1">
                        <p className="text-sm text-gray-800">
                           <FormattedToastMessage message={toast.message} />
                        </p>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex">
                        <button
                            onClick={() => onDismiss(toast.id)}
                            className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                            <span className="sr-only">Close</span>
                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


interface ToastContainerProps {
    toasts: ToastMessage[];
    dismissToast: (id: number) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, dismissToast }) => {
    return (
        <div
            aria-live="polite"
            aria-atomic="true"
            className="fixed bottom-0 left-0 right-0 p-4 pointer-events-none z-50 flex flex-col items-center"
        >
            <div className="w-full max-w-2xl space-y-4">
                {toasts.map(toast => (
                    <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
                ))}
            </div>
        </div>
    );
};
