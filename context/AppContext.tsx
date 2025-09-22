import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, UserRole, GradeSheet, GradeSheetStatus, PanelGrades } from '../types';
import { Client, Account, Databases, ID, Query, Functions, Models } from 'appwrite';

// --- Appwrite Configuration ---
// IMPORTANT: Replace these placeholder values with your actual Appwrite credentials.
const APPWRITE_ENDPOINT = 'https://fra.cloud.appwrite.io/v1'; // e.g., 'https://cloud.appwrite.io/v1'
const APPWRITE_PROJECT_ID = '68cc1bef00127055db1b';
const DATABASE_ID = '68d09abf000ecadf16f1';
const PROFILES_COLLECTION_ID = 'profiles';
const GRADESHEETS_COLLECTION_ID = 'gradesheets';
const VENUES_COLLECTION_ID = 'venues';
const GRADES_COLLECTION_ID = 'grades';


// These function IDs are needed for admin/adviser user management.
const CREATE_USER_FUNCTION_ID = 'placeholder';
const UPDATE_USER_FUNCTION_ID = 'placeholder';
const DELETE_USER_FUNCTION_ID = 'placeholder';


// Initialize Appwrite Client
const client = new Client();

if (APPWRITE_ENDPOINT !== 'https://fra.cloud.appwrite.io/v1' && APPWRITE_PROJECT_ID !== '68cc1bef00127055db1b') {
    client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID);
}

const account = new Account(client);
const databases = new Databases(client);
const functions = new Functions(client);

// Helper to map Appwrite document to our app's types
const fromAppwriteDocument = (doc: Models.Document) => {
    const { $id, ...data } = doc;
    return { id: $id, ...data } as any;
};

// Helper to safely parse JSON strings from the database
const safeJsonParse = (jsonString: string | null | undefined, defaultValue: any) => {
    if (!jsonString) return defaultValue;
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Failed to parse JSON string:", jsonString, e);
        return defaultValue;
    }
};

interface AppContextType {
    currentUser: User | null;
    users: User[];
    gradeSheets: GradeSheet[];
    venues: string[];
    isLoading: boolean;
    error: Error | null;
    retryLoad: () => void;
    login: (email: string, pass: string) => Promise<void>;
    logout: () => void;
    findUserById: (id: string) => User | undefined;
    getPanelSheets: (panelId: string) => GradeSheet[];
    updateGradeSheet: (sheet: GradeSheet) => Promise<void>;
    addGradeSheet: (sheetData: Omit<GradeSheet, 'id' | 'status'>) => Promise<void>;
    deleteGradeSheet: (sheetId: string) => Promise<void>;
    addUser: (userData: Omit<User, 'id'> & { password?: string }) => Promise<void>;
    updateUser: (user: User & { password?: string }) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
    changePassword: (oldPass: string, newPass: string) => Promise<boolean>;
    addVenue: (venue: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [gradeSheets, setGradeSheets] = useState<GradeSheet[]>([]);
    const [venues, setVenues] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const loadAppData = async () => {
        setIsLoading(true);
        setError(null);

        if (APPWRITE_PROJECT_ID === '68cc1bef00127055db1b') {
            const err = new Error('Appwrite credentials are not configured in context/AppContext.tsx');
            err.name = 'ConfigurationError';
            setError(err);
            setIsLoading(false);
            return;
        }

        try {
            const authUser = await account.get();
            
            const [
                profileResponse,
                allUsersDocs,
                allSheetsDocs,
                allVenuesDocs,
                allGradesDocs
            ] = await Promise.all([
                databases.listDocuments(DATABASE_ID!, PROFILES_COLLECTION_ID!, [Query.equal('userId', authUser.$id)]),
                fetchAllDocuments(DATABASE_ID!, PROFILES_COLLECTION_ID!),
                fetchAllDocuments(DATABASE_ID!, GRADESHEETS_COLLECTION_ID!),
                fetchAllDocuments(DATABASE_ID!, VENUES_COLLECTION_ID!),
                fetchAllDocuments(DATABASE_ID!, GRADES_COLLECTION_ID!) // Fetch all grade documents
            ]);

            if (profileResponse.documents.length === 0) {
                 throw new Error("Your user profile could not be found in the database. Please contact an administrator to have it created.");
            }
            const userProfile = fromAppwriteDocument(profileResponse.documents[0]);
            
            setCurrentUser({ id: authUser.$id, email: authUser.email, name: userProfile.name, role: userProfile.role });
            
            setUsers(allUsersDocs.map(doc => {
                 const profile = fromAppwriteDocument(doc);
                 return { id: profile.userId, name: profile.name, email: profile.email, role: profile.role };
            }));

            // Create a lookup map for grades for efficient merging
            const gradesMap: { [gradeSheetId: string]: { [panelId: string]: PanelGrades } } = {};
            allGradesDocs.forEach(doc => {
                const grade = doc as any;
                if (!gradesMap[grade.gradeSheetId]) {
                    gradesMap[grade.gradeSheetId] = {};
                }
                gradesMap[grade.gradeSheetId][grade.panelId] = safeJsonParse(grade.gradesData, null);
            });
            
            const mergedGradeSheets = allSheetsDocs.map(doc => {
                const sheet = fromAppwriteDocument(doc);
                const sheetGrades = gradesMap[sheet.id] || {};
                return { 
                    ...sheet, 
                    proponents: safeJsonParse(sheet.proponents, []), 
                    panel1Grades: sheet.panel1Id ? sheetGrades[sheet.panel1Id] : null,
                    panel2Grades: sheet.panel2Id ? sheetGrades[sheet.panel2Id] : null,
                };
            });
            
            setGradeSheets(mergedGradeSheets);
            setVenues(allVenuesDocs.map(doc => (doc as any).name));

        } catch (err: any) {
            console.error("Failed to load app data", err);
            if (err.code === 401 && !err.message) {
                 setError(new Error("Your session has expired. Please log in again."));
            } else {
                 setError(err as Error);
            }
            setCurrentUser(null);
        } finally {
             setIsLoading(false);
        }
    };
    
    // Helper to fetch all documents from a collection using pagination
    const fetchAllDocuments = async (dbId: string, collectionId: string, queries: string[] = []) => {
        let documents: Models.Document[] = [];
        let lastId: string | undefined = undefined;
        while (true) {
            const currentQueries = [...queries, Query.limit(100)];
            if (lastId) {
                currentQueries.push(Query.cursorAfter(lastId));
            }
            const response = await databases.listDocuments(dbId, collectionId, currentQueries);
            documents.push(...response.documents);
            if (response.documents.length < 100) break;
            lastId = response.documents[response.documents.length - 1].$id;
        }
        return documents;
    };
    
    useEffect(() => { loadAppData(); }, []);

    const login = async (email: string, pass: string) => {
        await account.createEmailPasswordSession(email, pass);
        await loadAppData();
    };

    const logout = async () => {
        try {
            await account.deleteSession('current');
        } catch (error) {
            console.error("Failed to logout", error);
        } finally {
            setCurrentUser(null);
            setUsers([]);
            setGradeSheets([]);
            setVenues([]);
            setError(null);
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
        const updatedSheetWithStatus = { ...sheet, status: updateGradeSheetStatus(sheet) };
        const { id, panel1Grades, panel2Grades, ...data } = updatedSheetWithStatus;
        
        // 1. Update the main gradesheet document (without grades)
        const payload = { ...data, proponents: JSON.stringify(data.proponents) };
        await databases.updateDocument(DATABASE_ID!, GRADESHEETS_COLLECTION_ID!, id, payload);

        // 2. Upsert (update or create) the grade documents for each panel
        const upsertGrades = async (grades: PanelGrades | undefined, panelId: string) => {
            if (!grades || !panelId) return;
            try {
                const existing = await databases.listDocuments(DATABASE_ID!, GRADES_COLLECTION_ID!, [
                    Query.equal('gradeSheetId', id),
                    Query.equal('panelId', panelId)
                ]);
                
                const gradesPayload = {
                    gradeSheetId: id,
                    panelId: panelId,
                    gradesData: JSON.stringify(grades)
                };

                if (existing.documents.length > 0) {
                    await databases.updateDocument(DATABASE_ID!, GRADES_COLLECTION_ID!, existing.documents[0].$id, gradesPayload);
                } else {
                    await databases.createDocument(DATABASE_ID!, GRADES_COLLECTION_ID!, ID.unique(), gradesPayload);
                }
            } catch (err) {
                console.error(`Failed to upsert grades for panel ${panelId} on sheet ${id}`, err);
                throw err;
            }
        };

        await Promise.all([
            upsertGrades(panel1Grades, sheet.panel1Id),
            upsertGrades(panel2Grades, sheet.panel2Id)
        ]);

        // 3. Update local state
        setGradeSheets(prev => prev.map(s => s.id === id ? updatedSheetWithStatus : s));
    };

    const addGradeSheet = async (sheetData: Omit<GradeSheet, 'id' | 'status'>) => {
        const newSheetData = { ...sheetData, status: GradeSheetStatus.NOT_STARTED };
        const payload = { ...newSheetData, proponents: JSON.stringify(newSheetData.proponents) };
        const newDoc = await databases.createDocument(DATABASE_ID!, GRADESHEETS_COLLECTION_ID!, ID.unique(), payload);
        const newSheet = fromAppwriteDocument(newDoc);
        setGradeSheets(prev => [...prev, { ...newSheet, proponents: safeJsonParse(newSheet.proponents, []), panel1Grades: null, panel2Grades: null }]);
    };
    
    const deleteGradeSheet = async (sheetId: string) => {
        // Also delete associated grade documents
        const gradeDocs = await databases.listDocuments(DATABASE_ID!, GRADES_COLLECTION_ID!, [Query.equal('gradeSheetId', sheetId)]);
        await Promise.all(gradeDocs.documents.map(doc => databases.deleteDocument(DATABASE_ID!, GRADES_COLLECTION_ID!, doc.$id)));

        await databases.deleteDocument(DATABASE_ID!, GRADESHEETS_COLLECTION_ID!, sheetId);
        setGradeSheets(prev => prev.filter(s => s.id !== sheetId));
    };

    const addUser = async (userData: Omit<User, 'id'> & { password?: string }) => {
        if (CREATE_USER_FUNCTION_ID === 'placeholder') {
            throw new Error("Admin function IDs are not configured in environment variables.");
        }
        await functions.createExecution(CREATE_USER_FUNCTION_ID, JSON.stringify(userData));
        const allUsersDocs = await fetchAllDocuments(DATABASE_ID!, PROFILES_COLLECTION_ID!);
        setUsers(allUsersDocs.map(doc => {
                 const profile = fromAppwriteDocument(doc);
                 return { id: profile.userId, name: profile.name, email: profile.email, role: profile.role };
        }));
    };

    const updateUser = async (user: User & { password?: string }) => {
        if (UPDATE_USER_FUNCTION_ID === 'placeholder') {
            throw new Error("Admin function IDs are not configured in environment variables.");
        }
        await functions.createExecution(UPDATE_USER_FUNCTION_ID, JSON.stringify(user));
        setUsers(prev => prev.map(u => u.id === user.id ? { id: user.id, email: user.email, name: user.name, role: user.role } : u));
        if (currentUser?.id === user.id) {
           setCurrentUser(prev => prev ? { ...prev, name: user.name, role: user.role } : null);
        }
    };
    
    const deleteUser = async (userId: string) => {
        if (DELETE_USER_FUNCTION_ID === 'placeholder') {
            throw new Error("Admin function IDs are not configured in environment variables.");
        }
        await functions.createExecution(DELETE_USER_FUNCTION_ID, JSON.stringify({ userId }));
        setUsers(prev => prev.filter(u => u.id !== userId));
    };

    const changePassword = async (oldPass: string, newPass: string): Promise<boolean> => {
       try {
            await account.updatePassword(newPass, oldPass);
            return true;
       } catch (error) {
            console.error("Failed to change password", error);
            return false;
       }
    };

    const addVenue = async (venue: string) => {
        if (venue && !venues.includes(venue)) {
            await databases.createDocument(DATABASE_ID!, VENUES_COLLECTION_ID!, ID.unique(), { name: venue });
            setVenues(prev => [...prev, venue]);
        }
    };
    
    const value = { currentUser, users, gradeSheets, venues, isLoading, error, retryLoad: loadAppData, login, logout, findUserById, getPanelSheets, updateGradeSheet, addGradeSheet, deleteGradeSheet, addUser, updateUser, deleteUser, changePassword, addVenue };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};