import React, { useState, ReactNode } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { Page, UserRole } from './types';

// Import all page components
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GradingSheet from './pages/GradingSheet';
import UserManagement from './pages/UserManagement';
import Masterlist from './pages/Masterlist';
import ChangePassword from './pages/ChangePassword';
import GroupManagement from './pages/GroupManagement';

// Import icons for sidebar
import { DashboardIcon, UsersIcon, ListIcon, DocumentAddIcon, KeyIcon } from './components/Icons';
import Header from './components/Header';

// --- UI Components for Loading & Error States ---

const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="flex flex-col items-center">
            <svg className="animate-spin -ml-1 mr-3 h-10 w-10 text-green-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-lg text-gray-600">Loading Application...</p>
        </div>
    </div>
);

const EnvironmentVariableGuide: React.FC<{ error: Error; onRetry: () => void }> = ({ error, onRetry }) => {
    const requiredVars = error.message.replace('Missing environment variables: ', '').split(', ');

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="w-full max-w-3xl p-8 bg-white shadow-lg rounded-lg border-t-4 border-yellow-500">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Configuration Needed</h1>
                <p className="text-gray-600 mb-6">
                    Welcome! To connect this application to your Appwrite backend, you need to set up your environment variables in your hosting provider (e.g., Vercel, Netlify).
                </p>

                <div className="bg-gray-50 p-4 rounded-lg">
                    <h2 className="text-lg font-semibold text-gray-700 mb-3">Required Variables:</h2>
                    <ul className="space-y-2">
                        {requiredVars.map(v => (
                            <li key={v} className="font-mono text-sm bg-gray-200 p-2 rounded">{v}</li>
                        ))}
                    </ul>
                </div>

                <div className="mt-6 text-sm text-gray-700">
                    <p className="font-semibold mb-2">How to find these values:</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li><strong>Project & Endpoint IDs:</strong> Found in your Appwrite project's 'Settings' page.</li>
                        <li><strong>Database & Collection IDs:</strong> Found by navigating to the 'Databases' section and clicking on your specific database and collections.</li>
                    </ul>
                </div>

                <div className="mt-8 text-center">
                    <button onClick={onRetry} className="px-8 py-3 bg-green-700 text-white font-semibold rounded-md hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                        Retry Connection
                    </button>
                </div>
            </div>
        </div>
    );
};

const GenericErrorDisplay: React.FC<{ error: Error, onRetry: () => void }> = ({ error, onRetry }) => (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="w-full max-w-2xl p-8 bg-white shadow-lg rounded-lg border-t-4 border-red-600 text-center">
            <div className="flex justify-center items-center mb-4">
                <svg className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Application Error</h1>
            <p className="text-gray-600 my-4">
                Sorry, the application could not be loaded. This might be due to a network issue or a server problem.
            </p>
            <div className="bg-red-50 p-4 rounded text-sm text-red-700 font-mono text-left">
                <strong>Details:</strong> {error.message || 'An unknown error occurred.'}
            </div>
             <div className="mt-8">
                <button onClick={onRetry} className="px-8 py-3 bg-green-700 text-white font-semibold rounded-md hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                    Try Again
                </button>
            </div>
        </div>
    </div>
);


// --- Core Application Layout Components ---

const NavLink: React.FC<{
    icon: ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
            isActive
                ? 'bg-green-800 text-white'
                : 'text-gray-200 hover:bg-green-600 hover:text-white'
        }`}
    >
        {icon}
        <span className="ml-3">{label}</span>
    </button>
);

const Sidebar: React.FC<{
    currentPage: Page;
    setPage: (page: Page) => void;
}> = ({ currentPage, setPage }) => {
    const { currentUser } = useAppContext();
    const isAdmin = currentUser?.role === UserRole.ADMIN;
    const isAdviser = currentUser?.role === UserRole.COURSE_ADVISER;

    return (
        <aside className="w-64 bg-green-700 text-white flex flex-col p-4">
            <nav className="flex-1 space-y-2">
                <NavLink
                    icon={<DashboardIcon className="w-6 h-6" />}
                    label="Dashboard"
                    isActive={currentPage === 'dashboard'}
                    onClick={() => setPage('dashboard')}
                />
                {(isAdmin || isAdviser) && (
                    <div>
                        <div className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-300 uppercase tracking-wider">
                            Management
                        </div>
                        <div className="space-y-2">
                             <NavLink
                                icon={<DocumentAddIcon className="w-6 h-6" />}
                                label="Group Management"
                                isActive={currentPage === 'group-management'}
                                onClick={() => setPage('group-management')}
                            />
                            <NavLink
                                icon={<ListIcon className="w-6 h-6" />}
                                label="Masterlist"
                                isActive={currentPage === 'masterlist'}
                                onClick={() => setPage('masterlist')}
                            />
                             <NavLink
                                icon={<UsersIcon className="w-6 h-6" />}
                                label="User Management"
                                isActive={currentPage === 'user-management'}
                                onClick={() => setPage('user-management')}
                            />
                        </div>
                    </div>
                )}
            </nav>
            <div className="mt-auto">
                 <NavLink
                    icon={<KeyIcon className="w-6 h-6" />}
                    label="Change Password"
                    isActive={currentPage === 'change-password'}
                    onClick={() => setPage('change-password')}
                />
            </div>
        </aside>
    );
};


// --- Main Application Component ---

const AppContent: React.FC = () => {
    const { currentUser, isLoading, error, retryLoad } = useAppContext();
    const [page, setPage] = useState<Page>('dashboard');
    const [selectedGradeSheetId, setSelectedGradeSheetId] = useState<string>('');

    if (isLoading) {
        return <LoadingSpinner />;
    }
    
    if (error) {
        if (error.name === 'ConfigurationError') {
             return <EnvironmentVariableGuide error={error} onRetry={retryLoad} />;
        }
        if (!currentUser) {
            return <GenericErrorDisplay error={error} onRetry={retryLoad} />;
        }
    }
    
    if (!currentUser) {
        return <Login />;
    }
    
    const navigateToGradeSheet = (id: string) => {
        setSelectedGradeSheetId(id);
        setPage('grading-sheet');
    };

    const renderPage = () => {
        switch (page) {
            case 'dashboard':
                return <Dashboard navigateToGradeSheet={navigateToGradeSheet} />;
            case 'grading-sheet':
                return <GradingSheet gradeSheetId={selectedGradeSheetId} setPage={setPage} />;
            case 'user-management':
                 return <UserManagement />;
            case 'masterlist':
                return <Masterlist />;
            case 'group-management':
                return <GroupManagement setPage={setPage} />;
            case 'change-password':
                return <ChangePassword />;
            default:
                return <Dashboard navigateToGradeSheet={navigateToGradeSheet} />;
        }
    };

    return (
        <div className="flex h-screen bg-gray-100">
            <div className="no-print">
                <Sidebar currentPage={page} setPage={setPage} />
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="no-print">
                    <Header />
                </div>
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 printable-area">
                    {renderPage()}
                </main>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <AppProvider>
            <AppContent />
        </AppProvider>
    );
};

export default App;