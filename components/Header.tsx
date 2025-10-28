
import React from 'react';
import { useAppContext } from '../context/AppContext';
import { APP_NAME } from '../constants';
import { LogoutIcon, MenuIcon } from './Icons';
import NotificationBell from './NotificationBell';

const Header: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
    const { currentUser, logout } = useAppContext();

    if (!currentUser) return null;

    return (
        <header className="bg-white shadow-md z-20">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <button
                            onClick={onMenuClick}
                            className="p-2 rounded-md text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500 md:hidden"
                            aria-label="Open sidebar"
                        >
                            <MenuIcon className="w-6 h-6" />
                        </button>
                        <div className="flex-shrink-0 ml-4 md:ml-0">
                            <h1 className="text-xl font-bold text-green-800">{APP_NAME}</h1>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        <NotificationBell />
                        <div className="text-right">
                            <p className="text-sm font-medium text-gray-800">{currentUser.name}</p>
                            <p className="text-xs text-gray-500">{currentUser.role}</p>
                        </div>
                        <button
                            onClick={logout}
                            className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            aria-label="Logout"
                        >
                            <LogoutIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;