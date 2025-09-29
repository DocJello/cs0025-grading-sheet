import { User, GradeSheet, GradeSheetStatus } from '../types';

// =====================================================================================
// !! CRITICAL ACTION REQUIRED !!
// =====================================================================================
// You MUST replace the placeholder URL below with the actual URL of your backend
// service that you deployed on Render.
//
// 1. Find your backend URL on your Render.com dashboard.
//    It will look like: 'https://your-app-name.onrender.com'
// 2. Replace the placeholder string below with your URL.
//
// Your application WILL NOT WORK until you do this.
// =====================================================================================
export const API_URL = 'https://cs0025-grading-sheet.onrender.com/';

const CURRENT_USER_KEY = 'currentUser'; // We still use localStorage for the logged-in user session

// Helper to handle API responses
const handleResponse = async (response: Response) => {
    if (response.status === 204) { // Handle No Content for DELETE
        return;
    }
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }
    return data;
};

// Helper for making fetch requests
const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    return handleResponse(response);
};

export const api = {
    getCurrentUser: async (): Promise<User | null> => {
        // Session is still managed on the client for simplicity
        const storedUser = localStorage.getItem(CURRENT_USER_KEY);
        return Promise.resolve(storedUser ? JSON.parse(storedUser) : null);
    },

    login: async (email: string, pass: string): Promise<User> => {
        const user = await apiFetch('/api/login', {
            method: 'POST',
            body: JSON.stringify({ email, pass }),
        });
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
        return user;
    },

    logout: async (): Promise<void> => {
        localStorage.removeItem(CURRENT_USER_KEY);
        return Promise.resolve();
    },

    getUsers: async (): Promise<User[]> => {
        return apiFetch('/api/users');
    },

    addUser: async (userData: Omit<User, 'id'>): Promise<User> => {
        return apiFetch('/api/users', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    },

    updateUser: async (user: User): Promise<User> => {
        const updatedUser = await apiFetch(`/api/users/${user.id}`, {
            method: 'PUT',
            body: JSON.stringify(user),
        });
         const currentUser = await api.getCurrentUser();
        if (currentUser?.id === updatedUser.id) {
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
        }
        return updatedUser;
    },

    deleteUser: async (userId: string): Promise<void> => {
        return apiFetch(`/api/users/${userId}`, { method: 'DELETE' });
    },

    changePassword: async (userId: string, oldPass: string, newPass: string): Promise<User> => {
        const updatedUser = await apiFetch(`/api/users/${userId}/change-password`, {
            method: 'POST',
            body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass }),
        });

        // The user object from the server has the new hash, so we update localStorage
        const currentUser = await api.getCurrentUser();
        if (currentUser?.id === userId) {
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
        }

        return updatedUser;
    },

    getGradeSheets: async (): Promise<GradeSheet[]> => {
        return apiFetch('/api/gradesheets');
    },

    addGradeSheet: async (sheetData: Omit<GradeSheet, 'id' | 'status'>): Promise<GradeSheet> => {
        // The backend will assign id and initial status
        const newSheetPayload = {
            ...sheetData,
            status: GradeSheetStatus.NOT_STARTED,
            // Ensure fields expected by DB are present
            panel1Grades: sheetData.panel1Grades || null,
            panel2Grades: sheetData.panel2Grades || null,
            proposedTitles: sheetData.proposedTitles || [],
        };
        return apiFetch('/api/gradesheets', {
            method: 'POST',
            body: JSON.stringify(newSheetPayload),
        });
    },

    updateGradeSheet: async (sheet: GradeSheet): Promise<GradeSheet> => {
        return apiFetch(`/api/gradesheets/${sheet.id}`, {
            method: 'PUT',
            body: JSON.stringify(sheet),
        });
    },

    deleteGradeSheet: async (sheetId: string): Promise<void> => {
        return apiFetch(`/api/gradesheets/${sheetId}`, { method: 'DELETE' });
    },
};
