import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, UserRole, GradeSheet, GradeSheetStatus, PanelGrades } from '../types';
import { Client, Account, Databases, ID, Query, Functions, Models, AppwriteException } from 'appwrite';

// --- Appwrite Configuration ---
const APPWRITE_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = '68cc1bef00127055db1b';
const DATABASE_ID = '68d09abf000ecadf16f1';
const PROFILES_COLLECTION_ID = 'profiles';
const GRADESHEETS_COLLECTION_ID = 'gradesheets'; 
const VENUES_COLLECTION_ID = 'venues';
const GRADES_COLLECTION_ID = 'grades';


// --- FINAL STEP: Configure Admin Functions ---
const CREATE_USER_FUNCTION_ID = 'REPLACE_WITH_YOUR_CREATE_USER_FUNCTION_ID';
const UPDATE_USER_FUNCTION_ID = 'REPLACE_WITH_YOUR_UPDATE_USER_FUNCTION_ID';
const DELETE_USER_FUNCTION_ID = 'REPLACE_WITH_YOUR_DELETE_USER_FUNCTION_ID';


const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

const account = new Account(client);
const databases = new Databases(client);
const functions = new Functions(client);

const fromAppwriteDocument = (doc: Models.Document) => {
    const { $id, ...data } = doc;
    return { id: $id, ...data } as any;
};

const safeJsonParse = (jsonString: string | null | undefined, defaultValue: any) => {
    if (!jsonString) return defaultValue;
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Failed to parse JSON string:", jsonString, e);
        return defaultValue;
    }
};

interface AppError {
    type: 'NETWORK_ERROR' | 'NOT_FOUND' | 'PERMISSION' | 'PROFILE_NOT_FOUND';
    message: string;
    context?: string; 
}

interface AppContextType {
    currentUser: User | null;
    users: User[];
    gradeSheets: GradeSheet[];
    venues: string[];
    isLoading: boolean;
    error: AppError | null;
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
    areAdminFunctionsConfigured: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [gradeSheets, setGradeSheets] = useState<GradeSheet[]>([]);
    const [venues, setVenues] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<AppError | null>(null);

    const areAdminFunctionsConfigured = 
        !CREATE_USER_FUNCTION_ID.includes('REPLACE') &&
        !UPDATE_USER_FUNCTION_ID.includes('REPLACE') &&
        !DELETE_USER_FUNCTION_ID.includes('REPLACE');

    const loadAppData = async () => {
        setIsLoading(true);
        setError(null);
        let currentStep = 'initializing';
        try {
            // STEP 1: Authenticate and get base user profile
            currentStep = 'authentication';
            const authUser = await account.get();
            
            currentStep = `fetching profile for user ${authUser.$id}`;
            const profileResponse = await databases.listDocuments(DATABASE_ID, PROFILES_COLLECTION_ID, [Query.equal('userId', authUser.$id)]);
            if (profileResponse.documents.length === 0) {
                 throw new AppwriteException("Your user profile was not found in the 'profiles' database collection. An administrator needs to create it.", 404, 'PROFILE_NOT_FOUND');
            }
            const userProfile = fromAppwriteDocument(profileResponse.documents[0]);
            setCurrentUser({ id: authUser.$id, email: authUser.email, name: userProfile.name, role: userProfile.role });

            // STEP 2: Fetch all user profiles
            currentStep = `collection '${PROFILES_COLLECTION_ID}'`;
            const allUsersDocs = await fetchAllDocuments(DATABASE_ID, PROFILES_COLLECTION_ID);
            setUsers(allUsersDocs.map(doc => {
                 const profile = fromAppwriteDocument(doc);
                 return { id: profile.userId, name: profile.name, email: profile.email, role: profile.role };
            }));

            // STEP 3: Fetch venues
            currentStep = `collection '${VENUES_COLLECTION_ID}'`;
            const allVenuesDocs = await fetchAllDocuments(DATABASE_ID, VENUES_COLLECTION_ID);
            setVenues(allVenuesDocs.map(doc => (doc as any).name));

            // STEP 4: Fetch all grades
            currentStep = `collection '${GRADES_COLLECTION_ID}'`;
            const allGradesDocs = await fetchAllDocuments(DATABASE_ID, GRADES_COLLECTION_ID);
            const gradesMap: { [gradeSheetId: string]: { [panelId: string]: PanelGrades } } = {};
            allGradesDocs.forEach(doc => {
                const grade = doc as any;
                if (!gradesMap[grade.gradeSheetId]) gradesMap[grade.gradeSheetId] = {};
                gradesMap[grade.gradeSheetId][grade.panelId] = safeJsonParse(grade.gradesData, null);
            });

            // STEP 5: Fetch all grade sheets and merge with grades
            currentStep = `collection '${GRADESHEETS_COLLECTION_ID}'`;
            const allSheetsDocs = await fetchAllDocuments(DATABASE_ID, GRADESHEETS_COLLECTION_ID);
            setGradeSheets(allSheetsDocs.map(doc => {
                const sheet = fromAppwriteDocument(doc);
                const sheetGrades = gradesMap[sheet.id] || {};
                return { 
                    ...sheet, 
                    proponents: safeJsonParse(sheet.proponents, []), 
                    panel1Grades: sheet.panel1Id ? sheetGrades[sheet.panel1Id] : undefined,
                    panel2Grades: sheet.panel2Id ? sheetGrades[sheet.panel2Id] : undefined,
                };
            }));

        } catch (err: any) {
            if (err instanceof AppwriteException && err.code === 401) {
                setCurrentUser(null);
            } else {
                console.error(`Failed to load app data during step: ${currentStep}`, err);
                setCurrentUser(null); 
                
                if (err instanceof AppwriteException) {
                     if (err.type === 'PROFILE_NOT_FOUND') {
                        setError({ type: 'PROFILE_NOT_FOUND', message: err.message });
                    } else if (err.code === 404) {
                        setError({ type: 'NOT_FOUND', message: `A required database resource was not found.`, context: currentStep });
                    } else if (err.code === 403) {
                         setError({ type: 'PERMISSION', message: `Permission denied while accessing a required resource.`, context: currentStep });
                    } else {
                        setError({ type: 'NETWORK_ERROR', message: `An Appwrite error occurred: ${err.message}`, context: currentStep });
                    }
                } else {
                     setError({ type: 'NETWORK_ERROR', message: `A network error occurred while trying to load data for: ${currentStep}. This is likely a CORS issue or a network block.`, context: currentStep });
                }
            }
        } finally {
             setIsLoading(false);
        }
    };
    
    const fetchAllDocuments = async (dbId: string, collectionId: string) => {
        let documents: Models.Document[] = [];
        let lastId: string | undefined = undefined;
        while (true) {
            const queries = [Query.limit(100)];
            if (lastId) queries.push(Query.cursorAfter(lastId));
            const response = await databases.listDocuments(dbId, collectionId, queries);
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
        } catch (error) { console.error("Failed to logout", error); }
        finally {
            setCurrentUser(null); setUsers([]); setGradeSheets([]); setVenues([]); setError(null);
        }
    };

    const findUserById = (id: string): User | undefined => users.find(u => u.id === id);
    const getPanelSheets = (panelId: string): GradeSheet[] => gradeSheets.filter(s => s.panel1Id === panelId || s.panel2Id === panelId);
    
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
        const payload = { ...data, proponents: JSON.stringify(data.proponents) };
        await databases.updateDocument(DATABASE_ID, GRADESHEETS_COLLECTION_ID, id, payload);

        const upsertGrades = async (grades: PanelGrades | undefined, panelId: string) => {
            if (!grades || !panelId) return;
            const existing = await databases.listDocuments(DATABASE_ID, GRADES_COLLECTION_ID, [Query.equal('gradeSheetId', id), Query.equal('panelId', panelId)]);
            const gradesPayload = { gradeSheetId: id, panelId: panelId, gradesData: JSON.stringify(grades) };
            if (existing.documents.length > 0) {
                await databases.updateDocument(DATABASE_ID, GRADES_COLLECTION_ID, existing.documents[0].$id, gradesPayload);
            } else {
                await databases.createDocument(DATABASE_ID, GRADES_COLLECTION_ID, ID.unique(), gradesPayload);
            }
        };
        await Promise.all([ upsertGrades(panel1Grades, sheet.panel1Id), upsertGrades(panel2Grades, sheet.panel2Id) ]);
        setGradeSheets(prev => prev.map(s => s.id === id ? updatedSheetWithStatus : s));
    };

    const addGradeSheet = async (sheetData: Omit<GradeSheet, 'id' | 'status'>) => {
        const payload = { ...sheetData, status: GradeSheetStatus.NOT_STARTED, proponents: JSON.stringify(sheetData.proponents) };
        const newDoc = await databases.createDocument(DATABASE_ID, GRADESHEETS_COLLECTION_ID, ID.unique(), payload);
        const newSheet = fromAppwriteDocument(newDoc);
        setGradeSheets(prev => [...prev, { ...newSheet, proponents: safeJsonParse(newSheet.proponents, []), panel1Grades: undefined, panel2Grades: undefined }]);
    };
    
    const deleteGradeSheet = async (sheetId: string) => {
        const gradeDocs = await databases.listDocuments(DATABASE_ID, GRADES_COLLECTION_ID, [Query.equal('gradeSheetId', sheetId)]);
        await Promise.all(gradeDocs.documents.map(doc => databases.deleteDocument(DATABASE_ID, GRADES_COLLECTION_ID, doc.$id)));
        await databases.deleteDocument(DATABASE_ID, GRADESHEETS_COLLECTION_ID, sheetId);
        setGradeSheets(prev => prev.filter(s => s.id !== sheetId));
    };

    const addUser = async (userData: Omit<User, 'id'> & { password?: string }) => {
        if (!areAdminFunctionsConfigured) throw new Error("Admin functions not configured.");
        await functions.createExecution(CREATE_USER_FUNCTION_ID, JSON.stringify(userData));
        await loadAppData();
    };

    const updateUser = async (user: User & { password?: string }) => {
        if (!areAdminFunctionsConfigured) throw new Error("Admin functions not configured.");
        await functions.createExecution(UPDATE_USER_FUNCTION_ID, JSON.stringify(user));
        await loadAppData();
    };
    
    const deleteUser = async (userId: string) => {
        if (!areAdminFunctionsConfigured) throw new Error("Admin functions not configured.");
        await functions.createExecution(DELETE_USER_FUNCTION_ID, JSON.stringify({ userId }));
        setUsers(prev => prev.filter(u => u.id !== userId));
    };

    const changePassword = async (oldPass: string, newPass: string): Promise<boolean> => {
       try { await account.updatePassword(newPass, oldPass); return true; }
       catch (error) { console.error("Failed to change password", error); return false; }
    };

    const addVenue = async (venue: string) => {
        if (venue && !venues.includes(venue)) {
            await databases.createDocument(DATABASE_ID, VENUES_COLLECTION_ID, ID.unique(), { name: venue });
            setVenues(prev => [...prev, venue]);
        }
    };
    
    const value = { currentUser, users, gradeSheets, venues, isLoading, error, retryLoad: loadAppData, login, logout, findUserById, getPanelSheets, updateGradeSheet, addGradeSheet, deleteGradeSheet, addUser, updateUser, deleteUser, changePassword, addVenue, areAdminFunctionsConfigured };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) throw new Error('useAppContext must be used within an AppProvider');
    return context;
};