import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { BellIcon } from './Icons';
import { Notification } from '../types';

const NotificationBell: React.FC = () => {
    const { notifications, markNotificationsAsRead, findUserById } = useAppContext();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.length;

    const handleToggle = () => {
        setIsOpen(!isOpen);
    };
    
    const handleMarkAllAsRead = () => {
        const idsToMark = notifications.map(n => n.id);
        if (idsToMark.length > 0) {
            markNotificationsAsRead(idsToMark);
        }
        setIsOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={handleToggle}
                className="relative p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                aria-label="View notifications"
            >
                <BellIcon className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 block h-5 w-5 rounded-full ring-2 ring-white bg-red-500 text-white text-xs flex items-center justify-center">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                        <div className="px-4 py-2 flex justify-between items-center border-b">
                            <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllAsRead}
                                    className="text-xs font-medium text-green-700 hover:text-green-800"
                                >
                                    Mark all as read
                                </button>
                            )}
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                            {unreadCount > 0 ? (
                                notifications.map(notification => (
                                    <div key={notification.id} className="block px-4 py-3 text-sm text-gray-700 border-b hover:bg-gray-50">
                                        <p>{notification.message}</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {new Date(notification.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-gray-500 py-4 text-sm">No new notifications</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
