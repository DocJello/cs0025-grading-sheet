
import React, { createContext, useState, useContext, ReactNode, useEffect, useRef } from 'react';
import { User, GradeSheet, GradeSheetStatus, Notification, ToastMessage, UserRole } from '../types';
// FIX: Removed API_URL import as it's no longer used in this file.
import { api } from './api';

interface AppContextType {
    currentUser: User | null;
    users: User[];
    gradeSheets: GradeSheet[];
    venues: string[];
    notifications: Notification[];
    toasts: ToastMessage[];
    login: (email: string, pass: string) => Promise<boolean>;
    logout: () => Promise<void>;
    findUserById: (id: string) => User | undefined;
    getPanelSheets: (panelId: string) => GradeSheet[];
    updateGradeSheet: (sheet: GradeSheet) => Promise<void>;
    addGradeSheet: (sheetData: Omit<GradeSheet, 'id' | 'status'>) => Promise<void>;
    deleteGradeSheet: (sheetId: string) => Promise<void>;
    deleteAllGradeSheets: () => Promise<void>;
    addUser: (userData: Omit<User, 'id'>) => Promise<void>;
    updateUser: (user: User) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
    changePassword: (oldPass: string, newPass: string) => Promise<boolean>;
    addVenue: (venue: string) => void;
    restoreData: (backupData: { users: User[], gradeSheets: GradeSheet[] }) => Promise<void>;
    dismissToast: (toastId: number) => void;
    markNotificationsAsRead: (ids: number[]) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// FIX: The API_URL is now correctly configured, so this error component and the runtime check are no longer needed.
// This resolves the TypeScript error about comparing two non-overlapping string literal types.
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [gradeSheets, setGradeSheets] = useState<GradeSheet[]>([]);
    const [venues, setVenues] = useState<string[]>(['AVR', 'CASE', 'FTIC-Project Room', 'FTIC-Discussion Room 1', 'FTIC-Discussion Room 2', 'FTIC-Discussion Room 3']);
    const [isLoading, setIsLoading] = useState(true);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const pollIntervalRef = useRef<number | null>(null);

    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                const [loadedUser, loadedUsers, loadedSheets] = await Promise.all([
                    api.getCurrentUser(),
                    api.getUsers(),
                    api.getGradeSheets(),
                ]);
                setCurrentUser(loadedUser);
                setUsers(loadedUsers);
                setGradeSheets(loadedSheets);
            } catch (error) {
                console.error("Failed to load initial data", error);
                // In a real app, you might want to show an error message to the user
                setCurrentUser(null); // Log out user if data fails to load
            } finally {
                setIsLoading(false);
            }
        };
        loadInitialData();
    }, []);

    const pollNotifications = async (userId: string) => {
        try {
            const fetchedNotifications = await api.getNotifications(userId);
            if (fetchedNotifications.length > 0) {
                 // Prevent showing toasts for notifications we already have in state
                const existingIds = new Set(notifications.map(n => n.id));
                const newNotifications = fetchedNotifications.filter(n => !existingIds.has(n.id));

                if (newNotifications.length > 0) {
                    // Also prevent showing toasts that have been shown in this session
                    const shownToastIds = new Set(JSON.parse(sessionStorage.getItem('shownToastIds') || '[]'));
                    const notificationsForToast = newNotifications.filter(n => !shownToastIds.has(n.id));

                    if (notificationsForToast.length > 0) {
                        setToasts(currentToasts => [...currentToasts, ...notificationsForToast.map(n => ({ id: n.id, message: n.message }))]);
                        notificationsForToast.forEach(n => shownToastIds.add(n.id));
                        sessionStorage.setItem('shownToastIds', JSON.stringify(Array.from(shownToastIds)));
                    }
                    
                    const sheetIdsToUpdate = [...new Set(newNotifications.map(n => n.grade_sheet_id).filter(Boolean))] as string[];
                    if (sheetIdsToUpdate.length > 0) {
                        const updatedSheets = await Promise.all(sheetIdsToUpdate.map(id => api.getGradeSheet(id)));
                        setGradeSheets(prevSheets => {
                            const sheetsMap = new Map(prevSheets.map(s => [s.id, s]));
                            updatedSheets.forEach(us => sheetsMap.set(us.id, us));
                            return Array.from(sheetsMap.values());
                        });
                    }
                }
                setNotifications(fetchedNotifications);
            } else {
                 setNotifications([]); // Clear if no unread notifications
            }
        } catch (error) {
            console.error("Failed to poll notifications", error);
        }
    };

    useEffect(() => {
        if (currentUser && currentUser.role !== UserRole.ADMIN) {
            pollNotifications(currentUser.id); // Initial poll
            pollIntervalRef.current = window.setInterval(() => {
                pollNotifications(currentUser.id);
            }, 15000); // Poll every 15 seconds
        }

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, [currentUser]);


    const login = async (email: string, pass: string): Promise<boolean> => {
        try {
            const user = await api.login(email, pass);
            setCurrentUser(user);
            sessionStorage.removeItem('shownToastIds');
            // After login, refresh data
            const [loadedUsers, loadedSheets] = await Promise.all([
                api.getUsers(),
                api.getGradeSheets(),
            ]);
            setUsers(loadedUsers);
            setGradeSheets(loadedSheets);
            return true;
        } catch {
            return false;
        }
    };

    const logout = async () => {
        await api.logout();
        setCurrentUser(null);
        setUsers([]);
        setGradeSheets([]);
        setNotifications([]);
        setToasts([]);
        sessionStorage.removeItem('shownToastIds');
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
        }
    };

    const findUserById = (id: string): User | undefined => users.find(u => u.id === id);

    const getPanelSheets = (panelId: string): GradeSheet[] =>
        gradeSheets.filter(sheet => sheet.panel1Id === panelId || sheet.panel2Id === panelId);
    
    const updateGradeSheetStatus = (sheet: GradeSheet): GradeSheetStatus => {
        const p1Done = sheet.panel1Grades?.submitted;
        const p2Done = sheet.panel2Grades?.submitted;
        if (p1Done && p2Done) return GradeSheetStatus.COMPLETED;
        if (p1Done) return GradeSheetStatus.PANEL_1_SUBMITTED;
        if (p2Done) return GradeSheetStatus.PANEL_2_SUBMITTED;
        
        const p1Started = sheet.panel1Grades && (Object.keys(sheet.panel1Grades.titleDefenseScores).length > 0 || sheet.panel1Grades.comments);
        const p2Started = sheet.panel2Grades && (Object.keys(sheet.panel2Grades.titleDefenseScores).length > 0 || sheet.panel2Grades.comments);
        if(p1Started || p2Started) return GradeSheetStatus.IN_PROGRESS;

        return GradeSheetStatus.NOT_STARTED;
    };
    
    const updateGradeSheet = async (sheet: GradeSheet) => {
        try {
            const updatedSheetWithStatus = { ...sheet, status: updateGradeSheetStatus(sheet) };
            const savedSheet = await api.updateGradeSheet(updatedSheetWithStatus);
            setGradeSheets(prev => prev.map(s => s.id === sheet.id ? savedSheet : s));
        } catch (error) {
            console.error("Failed to update grade sheet:", error);
            alert(`Error: Could not update the group. ${(error as Error).message}`);
        }
    };

    const addGradeSheet = async (sheetData: Omit<GradeSheet, 'id' | 'status'>) => {
        try {
            const newSheet = await api.addGradeSheet(sheetData);
            setGradeSheets(prev => [...prev, newSheet]);
        } catch (error) {
            console.error("Failed to add grade sheet:", error);
            alert(`Error: Could not add the group. ${(error as Error).message}`);
        }
    };
    
    const deleteGradeSheet = async (sheetId: string) => {
        await api.deleteGradeSheet(sheetId);
        setGradeSheets(prev => prev.filter(s => s.id !== sheetId));
    };

    const deleteAllGradeSheets = async () => {
        await api.deleteAllGradeSheets();
        setGradeSheets([]);
    };

    const addUser = async (userData: Omit<User, 'id'>) => {
        const newUser = await api.addUser(userData);
        setUsers(prev => [...prev, newUser]);
    };

    const updateUser = async (user: User) => {
        const updatedUser = await api.updateUser(user);
        setUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));
        if (currentUser?.id === user.id) {
            setCurrentUser(updatedUser);
        }
    };
    
    const deleteUser = async (userId: string) => {
        await api.deleteUser(userId);
        setUsers(prev => prev.filter(u => u.id !== userId));
    };

    const changePassword = async (oldPass: string, newPass: string): Promise<boolean> => {
        if (!currentUser) return false;
        try {
            // API now handles verification of the old password securely.
            const updatedUser = await api.changePassword(currentUser.id, oldPass, newPass);
            
            // The API returns the updated user object (with the new hash) and updates localStorage.
            // We just need to update React's state.
            setCurrentUser(updatedUser);
            setUsers(prev => prev.map(u => (u.id === updatedUser.id ? updatedUser : u)));
            
            return true;
        } catch (error) {
            console.error("Failed to change password:", error);
            // The api.changePassword function will throw an error if the old password is incorrect.
            return false;
        }
    };

    const addVenue = (venue: string) => {
        if (venue && !venues.includes(venue)) {
            setVenues(prev => [...prev, venue].sort());
        }
    };

    const restoreData = async (backupData: { users: User[], gradeSheets: GradeSheet[] }) => {
        await api.restoreData(backupData);
        // The page is reloaded in the component after this, so no need to refresh state here.
    };

    const dismissToast = (toastId: number) => {
        setToasts(currentToasts => currentToasts.filter(t => t.id !== toastId));
    };

    const markNotificationsAsRead = async (ids: number[]) => {
        try {
            await api.markNotificationsAsRead(ids);
            // Optimistically update the UI
            setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
        } catch (error) {
            console.error("Failed to mark notifications as read", error);
        }
    };
    
    const value = {
        currentUser,
        users,
        gradeSheets,
        venues,
        notifications,
        toasts,
        login,
        logout,
        findUserById,
        getPanelSheets,
        updateGradeSheet,
        addGradeSheet,
        deleteGradeSheet,
        deleteAllGradeSheets,
        addUser,
        updateUser,
        deleteUser,
        changePassword,
        addVenue,
        restoreData,
        dismissToast,
        markNotificationsAsRead,
    };
    
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <p className="text-xl font-semibold text-gray-700">Loading Application...</p>
                </div>
            </div>
        );
    }

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};