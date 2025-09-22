import React, { useState } from 'react';
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

// A component for the main layout after login
const MainApp: React.FC = () => {
    const { currentUser, isLoading, error, retryLoad } = useAppContext();
    const [page, setPage] = useState<Page>('dashboard');
    const [activeGradeSheetId, setActiveGradeSheetId] = useState<string | null>(null);

    const navigateToGradeSheet = (id: string) => {
        setActiveGradeSheetId(id);
        setPage('grading-sheet');
    };
    
    // This is the error boundary/loading screen for the whole app data loading process.
    if (isLoading) {
        return <div className="flex items-center justify-center h-screen"><div className="text-xl">Loading application...</div></div>;
    }
    
    if (error) {
         return (
            <div className="flex items-center justify-center h-screen bg-red-50 text-red-800">
                <div className="text-center p-8 max-w-lg mx-auto bg-white rounded-lg shadow-lg border border-red-200">
                    <h1 className="text-2xl font-bold mb-4">Application Error</h1>
                    <p className="mb-2">A problem occurred while loading the application data. This could be due to a network issue, an invalid configuration, or a server problem.</p>
                    <p className="text-sm font-mono bg-red-100 p-3 rounded mb-6">{error.message}</p>
                    {error.context && <p className="text-sm mb-6">Context: {error.context}</p>}
                    <button onClick={retryLoad} className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                        Try Again
                    </button>
                     <div className="text-left text-xs text-gray-600 mt-6 space-y-2">
                        <p><strong>Troubleshooting:</strong></p>
                        <ul className="list-disc list-inside">
                            <li>If this is a <strong>CORS error</strong>, ensure you have added your application's hostname to your Appwrite project's platform list.</li>
                             <li>If this is a <strong>'not found' error</strong>, verify that the database/collection IDs in <code>context/AppContext.tsx</code> are correct and exist in your Appwrite project.</li>
                            <li>If this is a <strong>permission error</strong>, check the read/write permissions for your collections in Appwrite.</li>
                        </ul>
                    </div>
                </div>
            </div>
        );
    }

    // If we're not loading and there's no error, but also no user, show login.
    if (!currentUser) {
        return <Login />;
    }

    const renderPage = () => {
        switch (page) {
            case 'dashboard':
                return <Dashboard navigateToGradeSheet={navigateToGradeSheet} />;
            case 'grading-sheet':
                if (activeGradeSheetId) {
                    return <GradingSheet gradeSheetId={activeGradeSheetId} setPage={setPage} />;
                }
                // Fallback if no ID is set
                setPage('dashboard'); 
                return null;
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

    // Sidebar navigation items
    const navItems = [
        { name: 'Dashboard', icon: DashboardIcon, page: 'dashboard', roles: [UserRole.ADMIN, UserRole.COURSE_ADVISER, UserRole.PANEL] },
        { name: 'Masterlist', icon: ListIcon, page: 'masterlist', roles: [UserRole.ADMIN, UserRole.COURSE_ADVISER] },
        { name: 'Group Management', icon: DocumentAddIcon, page: 'group-management', roles: [UserRole.ADMIN, UserRole.COURSE_ADVISER] },
        { name: 'User Management', icon: UsersIcon, page: 'user-management', roles: [UserRole.ADMIN] },
        { name: 'Change Password', icon: KeyIcon, page: 'change-password', roles: [UserRole.ADMIN, UserRole.COURSE_ADVISER, UserRole.PANEL] },
    ].filter(item => item.roles.includes(currentUser.role));

    return (
        <div className="min-h-screen bg-gray-100">
            <Header />
            <div className="flex">
                <aside className="w-64 bg-green-800 text-white flex-shrink-0 h-[calc(100vh-64px)] sticky top-16">
                    <nav className="p-4">
                        <ul>
                            {navItems.map(item => (
                                <li key={item.name} className="mb-2">
                                    <button
                                        onClick={() => setPage(item.page as Page)}
                                        className={`w-full flex items-center p-3 rounded-lg transition-colors ${
                                            page === item.page
                                                ? 'bg-green-700 font-bold'
                                                : 'hover:bg-green-700'
                                        }`}
                                    >
                                        <item.icon className="w-6 h-6 mr-3" />
                                        <span>{item.name}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </aside>
                <main className="flex-1 overflow-y-auto">
                    {renderPage()}
                </main>
            </div>
        </div>
    );
};

// The main App component that includes the provider
const App: React.FC = () => {
    return (
        <AppProvider>
            <MainApp />
        </AppProvider>
    );
};

export default App;
