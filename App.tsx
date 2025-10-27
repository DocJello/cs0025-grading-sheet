
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
import Footer from './components/Footer';


const NavLink: React.FC<{
    icon: ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
    closeSidebar: () => void;
}> = ({ icon, label, isActive, onClick, closeSidebar }) => (
    <button
        onClick={() => {
            onClick();
            closeSidebar();
        }}
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
    closeSidebar: () => void;
}> = ({ currentPage, setPage, closeSidebar }) => {
    const { currentUser } = useAppContext();
    const isAdmin = currentUser?.role === UserRole.ADMIN;
    const isAdviser = currentUser?.role === UserRole.COURSE_ADVISER;

    return (
        <aside className="w-64 bg-green-700 text-white flex flex-col h-full p-4">
            <nav className="flex-1 space-y-2">
                <NavLink
                    icon={<DashboardIcon className="w-6 h-6" />}
                    label="Dashboard"
                    isActive={currentPage === 'dashboard'}
                    onClick={() => setPage('dashboard')}
                    closeSidebar={closeSidebar}
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
                                closeSidebar={closeSidebar}
                            />
                            <NavLink
                                icon={<ListIcon className="w-6 h-6" />}
                                label="Masterlist"
                                isActive={currentPage === 'masterlist'}
                                onClick={() => setPage('masterlist')}
                                closeSidebar={closeSidebar}
                            />
                             <NavLink
                                icon={<UsersIcon className="w-6 h-6" />}
                                label="User Management"
                                isActive={currentPage === 'user-management'}
                                onClick={() => setPage('user-management')}
                                closeSidebar={closeSidebar}
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
                    closeSidebar={closeSidebar}
                />
            </div>
        </aside>
    );
};


const AppContent: React.FC = () => {
    const { currentUser } = useAppContext();
    const [page, setPage] = useState<Page>('dashboard');
    const [selectedGradeSheetId, setSelectedGradeSheetId] = useState<string>('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    if (!currentUser) {
        return <Login />;
    }

    const closeSidebar = () => setIsSidebarOpen(false);
    
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
        <div className="relative min-h-screen bg-gray-100">
             {/* Mobile menu overlay, shown when sidebar is open */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
                    onClick={closeSidebar}
                    aria-hidden="true"
                ></div>
            )}
            
            {/* Sidebar - now always fixed, but hidden/shown with transforms */}
            <div className={`fixed top-0 left-0 h-full transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:translate-x-0 z-40 no-print`}>
                 <Sidebar currentPage={page} setPage={setPage} closeSidebar={closeSidebar} />
            </div>

            {/* Content area - has padding on desktop to avoid fixed sidebar */}
            <div className="flex flex-col min-h-screen md:pl-64">
                <div className="no-print">
                    <Header onMenuClick={() => setIsSidebarOpen(true)} />
                </div>
                <main className="flex-1 bg-gray-100 printable-area">
                    {renderPage()}
                </main>
                <Footer />
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
