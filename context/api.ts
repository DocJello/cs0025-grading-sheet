import { User, GradeSheet, GradeSheetStatus, Notification } from '../types';
// =====================================================================================
export const API_URL = 'https://cs0025-grading-sheet.onrender.com';
// =====================================================================================

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

    deleteAllNonAdminUsers: async (): Promise<void> => {
        return apiFetch('/api/users/all-non-admin', { method: 'DELETE' });
    },

    changePassword: async (userId: string, oldPass: string, newPass: string): Promise<User> => {
        const updatedUser = await apiFetch(`/api/users/${userId}/change-password`, {
            method: 'POST',
            body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass }),
        });

        // The user object from the server has the new hash, so we update localStorage
        // FIX: Corrected typo from `api.getCurrent` to `api.getCurrentUser`.
        const currentUser = await api.getCurrentUser();
        if (currentUser?.id === userId) {
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
        }

        return updatedUser;
    },

    getGradeSheets: async (): Promise<GradeSheet[]> => {
        return apiFetch('/api/gradesheets');
    },

    getGradeSheet: async (sheetId: string): Promise<GradeSheet> => {
        return apiFetch(`/api/gradesheets/${sheetId}`);
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

    deleteAllGradeSheets: async (): Promise<void> => {
        return apiFetch('/api/gradesheets/all', { method: 'DELETE' });
    },

    resetAllGrades: async (): Promise<void> => {
        return apiFetch('/api/gradesheets/reset-all', { method: 'POST' });
    },

    restoreData: async (backupData: { users: User[], gradeSheets: GradeSheet[] }): Promise<void> => {
        return apiFetch('/api/restore', {
            method: 'POST',
            body: JSON.stringify(backupData),
        });
    },

    // --- Notification API Methods ---
    getNotifications: async (userId: string): Promise<Notification[]> => {
        return apiFetch(`/api/users/${userId}/notifications`);
    },
    
    markNotificationsAsRead: async (notificationIds: number[]): Promise<void> => {
        if (notificationIds.length === 0) return;
        return apiFetch('/api/notifications/read', {
            method: 'POST',
            body: JSON.stringify({ ids: notificationIds }),
        });
    },
};
