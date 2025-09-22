import React, { useState, ReactNode } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { Page, UserRole } from './types';

// Import pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GradingSheet from './pages/GradingSheet';
import UserManagement from './pages/UserManagement';
import Masterlist from './pages/Masterlist';
import GroupManagement from './pages/GroupManagement';
import ChangePassword from './pages/ChangePassword';

// Import components
import Header from './components/Header';
import { DashboardIcon, UsersIcon, ListIcon, DocumentAddIcon, KeyIcon } from './components/Icons';

// --- Diagnostic Error Display Components ---

const ProfileNotFoundError: React.FC<{ error: any; onRetry: () => void }> = ({ error, onRetry }) => (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="w-full max-w-3xl p-8 bg-white shadow-lg rounded-lg border-t-4 border-yellow-500">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">User Profile Not Found</h1>
            <p className="text-gray-600 mb-6">
                You have successfully logged in, but the application could not find your user profile in the database. An administrator needs to create a profile document for your account.
            </p>
            <div className="bg-yellow-50 p-4 rounded text-sm text-yellow-800 font-mono text-left">
                <strong>Details:</strong> {error.message || 'The user profile document is missing.'}
            </div>
             <div className="mt-8 text-center">
                <button onClick={onRetry} className="px-8 py-3 bg-green-700 text-white font-semibold rounded-md hover:bg-green-800">
                    Retry Connection
                </button>
            </div>
        </div>
    </div>
);

const CollectionNotFoundError: React.FC<{ error: any; onRetry: () => void }> = ({ error, onRetry }) => (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="w-full max-w-3xl p-8 bg-white shadow-lg rounded-lg border-t-4 border-red-600">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Database Collection Not Found</h1>
            <p className="text-gray-600 mb-6">
                The application failed to load because a required database collection could not be found. This usually means there is a typo in the Collection ID in your application's code.
            </p>
            <div className="bg-red-50 p-4 rounded text-left">
                <p className="font-semibold text-red-800">The application failed while trying to access:</p>
                <code className="font-mono text-sm text-red-900 bg-red-100 p-1 rounded mt-1 block">{error.context || 'Unknown'}</code>
                <p className="mt-4 text-sm text-red-800">Please go to your `context/AppContext.tsx` file and ensure the Collection ID constants exactly match the IDs in your Appwrite project.</p>
            </div>
             <div className="mt-8 text-center">
                <button onClick={onRetry} className="px-8 py-3 bg-green-700 text-white font-semibold rounded-md hover:bg-green-800">
                    Try Again
                </button>
            </div>
        </div>
    </div>
);

const PermissionError: React.FC<{ error: any; onRetry: () => void }> = ({ error, onRetry }) => (
     <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="w-full max-w-3xl p-8 bg-white shadow-lg rounded-lg border-t-4 border-purple-600">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Permission Denied</h1>
            <p className="text-gray-600 mb-6">
                The application was blocked from reading required data. This means your signed-in user does not have the correct permissions for one or more database collections.
            </p>
             <div className="bg-purple-50 p-4 rounded text-left text-sm">
                <p className="font-semibold text-purple-800 mb-2">How to fix this:</p>
                <ol className="list-decimal list-inside text-purple-700 space-y-1">
                    <li>The application failed while trying to access: <code className="font-mono text-sm bg-purple-100 p-1 rounded">{error.context || 'Unknown'}</code></li>
                    <li>Go to your Appwrite project and navigate to the <strong>Databases</strong> section.</li>
                    <li>For each collection (`profiles`, `gradesheets`, etc.), click on it and go to the <strong>Settings</strong> tab.</li>
                    <li>Under <strong>Permissions</strong>, ensure the role <strong>Users</strong> has been added with full <strong>Read</strong> access.</li>
                </ol>
            </div>
             <div className="mt-8 text-center">
                <button onClick={onRetry} className="px-8 py-3 bg-green-700 text-white font-semibold rounded-md hover:bg-green-800">
                    Try Again
                </button>
            </div>
        </div>
    </div>
);

const ConnectionTroubleshootingGuide: React.FC<{ error: any; onRetry: () => void }> = ({ error, onRetry }) => {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="w-full max-w-3xl p-8 bg-white shadow-lg rounded-lg border-t-4 border-red-600">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Connection Error</h1>
                <p className="text-gray-600 mb-6">
                    The application could not connect to the Appwrite backend. This is usually caused by a CORS misconfiguration or an external factor like a browser extension. Please follow this checklist to resolve the issue.
                </p>

                <div className="space-y-6 mt-6">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-700 mb-3">Step 1: Check Appwrite Platform Settings (CORS)</h2>
                        <ol className="list-decimal list-inside text-gray-600 space-y-2 text-sm">
                            <li>Go to your Appwrite project dashboard.</li>
                            <li>On the <strong>Overview</strong> page, find the "Integrations" section and click <strong>Add Platform</strong>, then choose <strong>Web</strong>.</li>
                            <li>In the <strong>Hostname</strong> field, add your Vercel domain. It is crucial to add **both** your main project domain and the specific deployment domain:
                                <div className="font-mono bg-gray-200 px-2 py-1 rounded my-2 text-xs text-gray-800">cs0025-gradesheet.vercel.app</div>
                                <div className="font-mono bg-gray-200 px-2 py-1 rounded text-xs text-gray-800">{window.location.hostname}</div>
                            </li>
                            <li>For local testing, also ensure you have a platform with the hostname: <code className="font-mono bg-gray-200 px-1 rounded">localhost</code></li>
                        </ol>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-gray-700 mb-3">Step 2: Check for External Blockers</h2>
                        <ol className="list-decimal list-inside text-gray-600 space-y-2 text-sm">
                            <li>
                                <strong>Test in an Incognito/Private Window:</strong> This is the best way to check if a browser extension (like an ad-blocker or security tool) is blocking the connection. If the site works in Incognito, the problem is one of your extensions.
                            </li>
                            <li>
                                <strong>Test on a Different Network:</strong> If you are on a school or corporate network, a firewall might be blocking the connection. Try using a mobile hotspot to see if the site loads.
                            </li>
                        </ol>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <button onClick={onRetry} className="px-8 py-3 bg-green-700 text-white font-semibold rounded-md hover:bg-green-800">
                        Try Again
                    </button>
                </div>
            </div>
        </div>
    );
};


const DiagnosticErrorDisplay: React.FC<{ error: any; onRetry: () => void }> = ({ error, onRetry }) => {
    switch (error.type) {
        case 'PROFILE_NOT_FOUND':
            return <ProfileNotFoundError error={error} onRetry={onRetry} />;
        case 'NOT_FOUND':
            return <CollectionNotFoundError error={error} onRetry={onRetry} />;
        case 'PERMISSION':
            return <PermissionError error={error} onRetry={onRetry} />;
        case 'NETWORK_ERROR':
        default:
            return <ConnectionTroubleshootingGuide error={error} onRetry={onRetry} />;
    }
};

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


const MainContent: React.FC = () => {
    const { currentUser, isLoading, error, retryLoad } = useAppContext();
    const [page, setPage] = useState<Page>('dashboard');
    const [activeGradeSheetId, setActiveGradeSheetId] = useState<string | null>(null);

    if (isLoading) {
        return <LoadingSpinner />;
    }
    
    if (error) {
         return <DiagnosticErrorDisplay error={error} onRetry={retryLoad} />;
    }

    if (!currentUser) {
        return <Login />;
    }

    const navigateToGradeSheet = (id: string) => {
        setActiveGradeSheetId(id);
        setPage('grading-sheet');
    };

    const renderPage = () => {
        switch (page) {
            case 'dashboard':
                return <Dashboard navigateToGradeSheet={navigateToGradeSheet} />;
            case 'grading-sheet':
                return activeGradeSheetId ? <GradingSheet gradeSheetId={activeGradeSheetId} setPage={setPage} /> : <Dashboard navigateToGradeSheet={navigateToGradeSheet} />;
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
    
    const navItems = [
        { name: 'Dashboard', icon: DashboardIcon, page: 'dashboard', roles: [UserRole.ADMIN, UserRole.COURSE_ADVISER, UserRole.PANEL] },
        { name: 'Group Management', icon: DocumentAddIcon, page: 'group-management', roles: [UserRole.ADMIN, UserRole.COURSE_ADVISER] },
        { name: 'Masterlist', icon: ListIcon, page: 'masterlist', roles: [UserRole.ADMIN, UserRole.COURSE_ADVISER] },
        { name: 'User Management', icon: UsersIcon, page: 'user-management', roles: [UserRole.ADMIN] },
    ].filter(item => currentUser && item.roles.includes(currentUser.role));


    return (
        <div className="flex h-screen bg-gray-100">
            <aside className="w-64 bg-green-800 text-white flex-shrink-0 flex flex-col p-4 no-print">
                <nav className="flex-1 space-y-2">
                     {navItems.map(item => (
                        <button key={item.name} onClick={() => setPage(item.page as Page)}
                            className={`w-full flex items-center p-3 rounded-lg transition-colors text-left ${ page === item.page ? 'bg-green-700 font-bold' : 'hover:bg-green-700'}`}>
                            <item.icon className="w-6 h-6 mr-3" />
                            <span>{item.name}</span>
                        </button>
                    ))}
                </nav>
                 <div className="mt-auto">
                     <button onClick={() => setPage('change-password')}
                        className={`w-full flex items-center p-3 rounded-lg transition-colors text-left ${ page === 'change-password' ? 'bg-green-700 font-bold' : 'hover:bg-green-700' }`}>
                        <KeyIcon className="w-6 h-6 mr-3" />
                        <span>Change Password</span>
                    </button>
                </div>
            </aside>
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
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
            <MainContent />
        </AppProvider>
    );
};

export default App;