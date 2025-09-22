import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, UserRole, GradeSheet, GradeSheetStatus } from '../types';

// Dummy data for grade sheets, users will be fetched from API
const initialGradeSheets: GradeSheet[] = [];

interface AppContextType {
    currentUser: User | null;
    users: User[];
    gradeSheets: GradeSheet[];
    venues: string[];
    isLoading: boolean;
    login: (email: string, pass: string) => Promise<string>;
    logout: () => void;
    findUserById: (id: string) => User | undefined;
    getPanelSheets: (panelId: string) => GradeSheet[];
    updateGradeSheet: (sheet: GradeSheet) => void;
    addGradeSheet: (sheetData: Omit<GradeSheet, 'id' | 'status'>) => void;
    deleteGradeSheet: (sheetId: string) => void;
    addUser: (userData: Omit<User, 'id'>) => Promise<void>;
    updateUser: (user: User) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
    changePassword: (oldPass: string, newPass: string) => Promise<string>;
    addVenue: (venue: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// A helper to extract the error message from a failed API response.
const getApiErrorMessage = async (response: Response): Promise<string> => {
    try {
        const errorData = await response.json();
        return errorData.error || `Request failed with status: ${response.status}`;
    } catch {
        return `Request failed with status: ${response.status}`;
    }
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [gradeSheets, setGradeSheets] = useState<GradeSheet[]>(() => {
        // For now, continue to use localStorage for grade sheets to limit scope of change
        const storedSheets = localStorage.getItem('gradeSheets');
        return storedSheets ? JSON.parse(storedSheets) : initialGradeSheets;
    });
    const [venues, setVenues] = useState<string[]>(['Room 404', 'Room 405', 'Auditorium']);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users');
            if (!response.ok) {
                const errorMessage = await getApiErrorMessage(response);
                throw new Error(errorMessage);
            }
            const data: User[] = await response.json();
            setUsers(data);
        } catch (error) {
            console.error("Critical error fetching users:", error);
            // In a real app, you might want to set a global error state here
            // to render an error message to the user, preventing them from using a broken app.
        }
    };

    useEffect(() => {
        setIsLoading(true);
        // In a real app with auth tokens, you'd verify the token here to restore a session.
        // For now, we just fetch the list of all users on initial load.
        fetchUsers().finally(() => setIsLoading(false));
    }, []);

    // Persist grade sheets to localStorage until they are migrated to the backend
    useEffect(() => {
        localStorage.setItem('gradeSheets', JSON.stringify(gradeSheets));
    }, [gradeSheets]);

    const login = async (email: string, pass: string): Promise<string> => {
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, pass }),
            });
            
            if (!response.ok) {
                return await getApiErrorMessage(response);
            }

            const user = await response.json();
            setCurrentUser(user);
            return ""; // Return empty string for success
        } catch (error) {
            console.error('Login failed:', error);
            return "Login request could not be completed. Check your network connection.";
        }
    };

    const logout = () => {
        setCurrentUser(null);
        // In a real app, this would also call a backend endpoint to invalidate a session token
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
    
    const updateGradeSheet = (sheet: GradeSheet) => {
        const updatedSheetWithStatus = { ...sheet, status: updateGradeSheetStatus(sheet) };
        setGradeSheets(prev => prev.map(s => s.id === sheet.id ? updatedSheetWithStatus : s));
    };

    const addGradeSheet = (sheetData: Omit<GradeSheet, 'id' | 'status'>) => {
        const newSheet: GradeSheet = {
            ...sheetData,
            id: `gs_${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            status: GradeSheetStatus.NOT_STARTED,
        };
        setGradeSheets(prev => [...prev, newSheet]);
    };
    
    const deleteGradeSheet = (sheetId: string) => {
        setGradeSheets(prev => prev.filter(s => s.id !== sheetId));
    };

    const addUser = async (userData: Omit<User, 'id'>) => {
       try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData),
            });
            if (!response.ok) {
                const errorMessage = await getApiErrorMessage(response);
                throw new Error(errorMessage);
            }
            await fetchUsers(); // Re-fetch all users to update state
       } catch (error) {
           console.error('Add user failed:', error);
       }
    };

    const updateUser = async (user: User) => {
        try {
            const response = await fetch(`/api/users`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(user),
            });
            if (!response.ok) {
                const errorMessage = await getApiErrorMessage(response);
                throw new Error(errorMessage);
            }

            if (currentUser?.id === user.id) {
                setCurrentUser(user);
            }
            await fetchUsers(); // Re-fetch all users to update state
        } catch (error) {
            console.error('Update user failed:', error);
        }
    };
    
    const deleteUser = async (userId: string) => {
        try {
            const response = await fetch(`/api/users?id=${userId}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const errorMessage = await getApiErrorMessage(response);
                throw new Error(errorMessage);
            }
            await fetchUsers(); // Re-fetch all users to update state
        } catch (error) {
            console.error('Delete user failed:', error);
        }
    };

    const changePassword = async (oldPass: string, newPass: string): Promise<string> => {
        if (!currentUser) return "No user is currently logged in.";
        try {
            const response = await fetch('/api/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id, oldPassword: oldPass, newPassword: newPass }),
            });

            if (!response.ok) {
                return await getApiErrorMessage(response);
            }

            // Also update the passwordHash on the currentUser object in the state
            // to keep the client-side state in sync without needing a re-fetch.
            const updatedUser = { ...currentUser, passwordHash: newPass };
            setCurrentUser(updatedUser);
            setUsers(prevUsers => prevUsers.map(u => u.id === currentUser.id ? updatedUser : u));

            return ""; // Return empty string for success
        } catch (error) {
            console.error('Change password request failed:', error);
            return "Request could not be completed. Check your network connection.";
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
        isLoading,
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

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};