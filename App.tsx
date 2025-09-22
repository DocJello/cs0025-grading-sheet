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

const ConnectionErrorGuide: React.FC = () => {
    const { error, retryLoad } = useAppContext();
    const currentHostname = window.location.hostname;
    
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="w-full max-w-3xl p-8 bg-white shadow-lg rounded-lg border-t-4 border-red-600">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Connection Error</h1>
                <p className="text-gray-600 mb-6">
                    The application could not connect to the Appwrite backend. This is usually caused by a misconfiguration in your Appwrite project or by an external factor like a browser extension. Please follow this checklist to resolve the issue.
                </p>

                <div className="space-y-6">
                    {/* Step 1: CORS/Platform Settings */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h2 className="text-lg font-semibold text-gray-700">Step 1: Check Appwrite Platform Settings (CORS)</h2>
                        <ol className="list-decimal list-inside space-y-2 mt-2 text-sm text-gray-600">
                            <li>Go to your Appwrite project dashboard.</li>
                            <li>On the <strong>Overview</strong> page, find the "Integrations" section and click <strong>Add Platform</strong>, then choose <strong>Web</strong>.</li>
                            <li>
                                In the <strong>Hostname</strong> field, add your Vercel domain. It is crucial to add both your main project domain and the specific deployment domain:
                                <code className="block w-full bg-gray-200 p-2 mt-2 rounded font-mono text-xs">cs0025-gradesheet.vercel.app</code>
                                <code className="block w-full bg-gray-200 p-2 mt-1 rounded font-mono text-xs">{currentHostname}</code>
                            </li>
                             <li>For local testing, also ensure you have a platform with the hostname: <code className="bg-gray-200 p-1 rounded font-mono text-xs">localhost</code></li>
                        </ol>
                    </div>

                    {/* Step 2: External Factors */}
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <h2 className="text-lg font-semibold text-yellow-800">Step 2: Check for External Factors (Very Likely Cause)</h2>
                        <p className="mt-2 text-sm text-yellow-700">If your Platform settings are correct, the problem is almost certainly one of these:</p>
                        <ul className="list-disc list-inside space-y-2 mt-2 text-sm text-yellow-700">
                            <li><strong>Browser Extensions:</strong> Security software, ad-blockers, or privacy extensions (like Trend Micro, uBlock Origin, Privacy Badger) can block the connection. <strong>Try temporarily disabling all extensions and reloading the page.</strong></li>
                            <li><strong>Different Browser:</strong> Try opening the website in a different web browser (e.g., if you are using Chrome, try Firefox or Edge) to see if the issue is browser-specific.</li>
                            <li><strong>Network Firewall:</strong> If you are on a corporate, school, or public Wi-Fi network, a firewall may be blocking the connection. Try accessing the site from a different network, like your mobile data hotspot.</li>
                        </ul>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <button onClick={retryLoad} className="px-8 py-3 bg-green-700 text-white font-semibold rounded-md hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                        Retry Connection
                    </button>
                </div>
            </div>
        </div>
    );
};


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
    const { currentUser, isLoading, error } = useAppContext();
    const [page, setPage] = useState<Page>('dashboard');
    const [selectedGradeSheetId, setSelectedGradeSheetId] = useState<string>('');

    if (isLoading) {
        return <LoadingSpinner />;
    }
    
    if (error) {
        return <ConnectionErrorGuide />;
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