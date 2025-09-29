import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, GradeSheet, GradeSheetStatus } from '../types';
import { api, API_URL } from './api';

interface AppContextType {
    currentUser: User | null;
    users: User[];
    gradeSheets: GradeSheet[];
    venues: string[];
    login: (email: string, pass: string) => Promise<boolean>;
    logout: () => Promise<void>;
    findUserById: (id: string) => User | undefined;
    getPanelSheets: (panelId: string) => GradeSheet[];
    updateGradeSheet: (sheet: GradeSheet) => Promise<void>;
    addGradeSheet: (sheetData: Omit<GradeSheet, 'id' | 'status'>) => Promise<void>;
    deleteGradeSheet: (sheetId: string) => Promise<void>;
    addUser: (userData: Omit<User, 'id'>) => Promise<void>;
    updateUser: (user: User) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
    changePassword: (oldPass: string, newPass: string) => Promise<boolean>;
    addVenue: (venue: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const ConfigurationError: React.FC = () => (
    <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
        <div className="max-w-2xl w-full bg-white rounded-lg shadow-2xl p-8 border-2 border-red-500">
            <h1 className="text-3xl font-bold text-red-700 mb-4">Configuration Error</h1>
            <p className="text-lg text-gray-800 mb-6">
                The application cannot connect to the backend server because the server address has not been configured.
            </p>
            <div className="bg-gray-100 p-4 rounded-md">
                <p className="font-semibold text-gray-900 mb-2">To fix this:</p>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>Open the file <code className="bg-red-100 text-red-800 font-mono p-1 rounded">context/api.ts</code> in your code editor.</li>
                    <li>Find the line that starts with <code className="bg-red-100 text-red-800 font-mono p-1 rounded">export const API_URL = ...</code></li>
                    <li>Replace the placeholder URL with the actual URL of your backend deployed on Render.</li>
                </ol>
            </div>
        </div>
    </div>
);


export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Check for placeholder URL to prevent runtime errors and guide the developer
    if (API_URL === 'https://YOUR_RENDER_BACKEND_URL_HERE.onrender.com') {
        return <ConfigurationError />;
    }

    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [gradeSheets, setGradeSheets] = useState<GradeSheet[]>([]);
    const [venues, setVenues] = useState<string[]>(['Room 404', 'Room 405', 'Auditorium']);
    const [isLoading, setIsLoading] = useState(true);

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

    const login = async (email: string, pass: string): Promise<boolean> => {
        try {
            const user = await api.login(email, pass);
            setCurrentUser(user);
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
        const updatedSheetWithStatus = { ...sheet, status: updateGradeSheetStatus(sheet) };
        const savedSheet = await api.updateGradeSheet(updatedSheetWithStatus);
        setGradeSheets(prev => prev.map(s => s.id === sheet.id ? savedSheet : s));
    };

    const addGradeSheet = async (sheetData: Omit<GradeSheet, 'id' | 'status'>) => {
        const newSheet = await api.addGradeSheet(sheetData);
        setGradeSheets(prev => [...prev, newSheet]);
    };
    
    const deleteGradeSheet = async (sheetId: string) => {
        await api.deleteGradeSheet(sheetId);
        setGradeSheets(prev => prev.filter(s => s.id !== sheetId));
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
            setVenues(prev => [...prev, venue]);
        }
    };
    
    const value = {
        currentUser,
        users,
        gradeSheets,
        venues,
        login,
        logout,
        findUserById,
        getPanelSheets,
        updateGradeSheet,
        addGradeSheet,
        deleteGradeSheet,
        addUser,
        updateUser,
        deleteUser,
        changePassword,
        addVenue,
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
