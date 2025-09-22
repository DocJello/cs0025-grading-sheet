import React, { useState } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { UserRole, Page } from './types';
import { DashboardIcon, UsersIcon, ListIcon, KeyIcon, DocumentAddIcon } from './components/Icons';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GradingSheet from './pages/GradingSheet';
import UserManagement from './pages/UserManagement';
import Masterlist from './pages/Masterlist';
import GroupManagement from './pages/GroupManagement';
import ChangePassword from './pages/ChangePassword';
import Header from './components/Header';
import { APP_NAME } from './constants';

const ConnectionTroubleshootingGuide: React.FC<{ error: any; onRetry: () => void }> = ({ error, onRetry }) => {
    // Attempt to get the specific Vercel deployment URL from the current window location
    const currentHostname = window.location.hostname;
    const mainVercelDomain = currentHostname.includes('vercel.app') ? currentHostname.split('-').slice(0, 2).join('-') + '.vercel.app' : 'your-project.vercel.app';
    
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="w-full max-w-3xl p-8 bg-white shadow-lg rounded-lg border-t-4 border-red-600">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Connection Error</h1>
                <p className="text-gray-600 mb-6">
                    The application could not connect to the Appwrite backend. This is usually caused by a misconfiguration in your Appwrite project or by an external factor like a browser extension. Please follow this checklist to resolve the issue.
                </p>

                <div className="space-y-6">
                    {/* Step 1: CORS Check */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <h2 className="text-lg font-semibold text-gray-700">Step 1: Check Appwrite Platform Settings (CORS)</h2>
                        <ol className="list-decimal list-inside mt-2 text-sm text-gray-600 space-y-2">
                            <li>Go to your Appwrite project dashboard at <a href="https://cloud.appwrite.io" target="_blank" rel="noopener noreferrer" className="text-green-700 underline">cloud.appwrite.io</a>.</li>
                            <li>On the <strong>Overview</strong> page, find the "Integrations" section and click <strong>Add Platform</strong>, then choose <strong>Web</strong>.</li>
                            <li>In the <strong>Hostname</strong> field, add your Vercel domain. It is crucial to add both your main project domain and the specific deployment domain:
                                <div className="font-mono bg-gray-200 p-2 rounded my-2 text-xs">
                                    <p>{mainVercelDomain}</p>
                                    <p>{currentHostname}</p>
                                </div>
                            </li>
                            <li>For local testing, also ensure you have a platform with the hostname: <code className="font-mono bg-gray-200 px-1 rounded">localhost</code></li>
                        </ol>
                    </div>

                    {/* Step 2: External Blockers Check */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                         <h2 className="text-lg font-semibold text-gray-700">Step 2: Check for External Blockers</h2>
                        <p className="mt-2 text-sm text-gray-600">If your Platform settings are correct, the connection is likely being blocked by software on your computer or network.</p>
                        <ul className="list-disc list-inside mt-2 text-sm text-gray-600 space-y-2">
                            <li>
                                <strong>Test in an Incognito/Private Window:</strong> This is the most important test. It runs the browser without extensions (like ad-blockers or security tools like Trend Micro) which often cause this error. Press <code className="font-mono bg-gray-200 px-1 rounded">Ctrl+Shift+N</code> (or <code className="font-mono bg-gray-200 px-1 rounded">Cmd+Shift+N</code> on Mac) and try the website again.
                            </li>
                            <li>
                                <strong>Try a Different Network:</strong> If Incognito mode doesn't work, try connecting through a different network (e.g., a mobile hotspot) to check if a school or work firewall is blocking the connection.
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <button onClick={onRetry} className="px-8 py-3 bg-green-700 text-white font-semibold rounded-md hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                        I've checked everything, Try Again
                    </button>
                </div>
            </div>
        </div>
    );
};

const MainContent: React.FC = () => {
    const { currentUser, isLoading, error, retryLoad } = useAppContext();
    const [page, setPage] = = useState<Page>('dashboard');
    const [selectedGradeSheetId, setSelectedGradeSheetId] = useState<string | null>(null);

    const navigateToGradeSheet = (id: string) => {
        setSelectedGradeSheetId(id);
        setPage('grading-sheet');
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen w-screen bg-gray-100">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-green-700 mx-auto"></div>
                    <p className="mt-4 text-lg text-gray-700">Loading Application...</p>
                </div>
            </div>
        );
    }

    if (error) {
       return <ConnectionTroubleshootingGuide error={error} onRetry={retryLoad} />;
    }
    
    if (!currentUser) {
        return <Login />;
    }

    const renderPage = () => {
        switch (page) {
            case 'dashboard':
                return <Dashboard navigateToGradeSheet={navigateToGradeSheet} />;
            case 'grading-sheet':
                return selectedGradeSheetId ? <GradingSheet gradeSheetId={selectedGradeSheetId} setPage={setPage} /> : <Dashboard navigateToGradeSheet={navigateToGradeSheet} />;
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
            <Sidebar currentPage={page} setPage={setPage} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 print:bg-white">
                    {renderPage()}
                </main>
            </div>
        </div>
    );
};


const NavItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center w-full px-4 py-3 text-sm font-medium transition-colors duration-200 ${
            isActive
                ? 'bg-green-700 text-white'
                : 'text-gray-200 hover:bg-green-800 hover:text-white'
        }`}
    >
        {icon}
        <span className="ml-3">{label}</span>
    </button>
);

const Sidebar: React.FC<{ currentPage: Page, setPage: (page: Page) => void }> = ({ currentPage, setPage }) => {
    const { currentUser } = useAppContext();

    if (!currentUser) return null;
    
    const navItems: { page: Page; label: string; icon: React.ReactNode; roles: UserRole[] }[] = [
        { page: 'dashboard', label: 'Dashboard', icon: <DashboardIcon className="w-6 h-6" />, roles: [UserRole.ADMIN, UserRole.COURSE_ADVISER, UserRole.PANEL] },
        { page: 'masterlist', label: 'Masterlist', icon: <ListIcon className="w-6 h-6" />, roles: [UserRole.ADMIN, UserRole.COURSE_ADVISER] },
        { page: 'group-management', label: 'Group Management', icon: <DocumentAddIcon className="w-6 h-6" />, roles: [UserRole.ADMIN, UserRole.COURSE_ADVISER] },
        { page: 'user-management', label: 'User Management', icon: <UsersIcon className="w-6 h-6" />, roles: [UserRole.ADMIN, UserRole.COURSE_ADVISER] },
        { page: 'change-password', label: 'Change Password', icon: <KeyIcon className="w-6 h-6" />, roles: [UserRole.ADMIN, UserRole.COURSE_ADVISER, UserRole.PANEL] },
    ];
    
    const accessibleNavItems = navItems.filter(item => item.roles.includes(currentUser.role));

    return (
        <div className="flex flex-col w-64 bg-green-900 text-white h-screen z-30 shadow-lg no-print">
            <div className="flex items-center justify-center h-16 border-b border-green-800">
                <h1 className="text-lg font-bold">{APP_NAME}</h1>
            </div>
            <nav className="flex-1 py-4">
                {accessibleNavItems.map(item => (
                    <NavItem
                        key={item.page}
                        icon={item.icon}
                        label={item.label}
                        isActive={currentPage === item.page}
                        onClick={() => setPage(item.page)}
                    />
                ))}
            </nav>
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
