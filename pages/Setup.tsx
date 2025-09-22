import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { APP_NAME } from '../constants';

const Setup: React.FC = () => {
    const { setupDatabase } = useAppContext();
    const [status, setStatus] = useState('');
    const [isSettingUp, setIsSettingUp] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSetup = async () => {
        setStatus('');
        setIsSettingUp(true);
        const errorMessage = await setupDatabase();
        if (errorMessage) {
            setStatus(`Error: ${errorMessage}`);
            setIsSuccess(false);
        } else {
            setStatus('Database initialized successfully! The application will now reload.');
            setIsSuccess(true);
            setTimeout(() => {
                window.location.reload();
            }, 3000);
        }
        setIsSettingUp(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 text-center">
                <div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                        First-Time Setup
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        {APP_NAME}
                    </p>
                </div>
                <div className="bg-white p-8 shadow-lg rounded-lg">
                    <p className="text-gray-700 mb-6">
                        Welcome! It looks like the database hasn't been initialized yet. Click the button below to set up the necessary tables and seed initial user data.
                    </p>
                    <button
                        type="button"
                        onClick={handleSetup}
                        disabled={isSettingUp || isSuccess}
                        className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-700 hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-400"
                    >
                        {isSettingUp ? 'Initializing...' : 'Initialize Database'}
                    </button>
                    {status && (
                        <p className={`mt-4 text-sm ${isSuccess ? 'text-green-600' : 'text-red-600'}`}>
                            {status}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Setup;
