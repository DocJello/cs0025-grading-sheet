// FIX: Full content for types.ts
export enum UserRole {
    ADMIN = 'Admin',
    COURSE_ADVISER = 'Course Adviser',
    PANEL = 'Panel',
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    password_hash: string;
}

export interface Student {
    id: string;
    name: string;
}

export interface RubricLevel {
    range: string;
    description: string;
}

export interface RubricItem {
    id: string;
    criteria: string;
    weight: number;
    levels: RubricLevel[];
}

export interface PanelGrades {
    titleDefenseScores: { [rubricItemId: string]: number };
    individualScores: { [studentId: string]: { [rubricItemId: string]: number } };
    comments: string;
    submitted: boolean;
}

export enum GradeSheetStatus {
    NOT_STARTED = 'Not Started',
    IN_PROGRESS = 'In Progress',
    PANEL_1_SUBMITTED = 'Panel 1 Submitted',
    PANEL_2_SUBMITTED = 'Panel 2 Submitted',
    COMPLETED = 'Completed',
}

export interface GradeSheet {
    id: string;
    groupName: string;
    proponents: Student[];
    proposedTitles: string[];
    selectedTitle: string;
    program: 'BSCS-AI' | 'BSCS-DS' | 'BSCS-SE' | '';
    date: string;
    venue: string;
    panel1Id: string;
    panel2Id: string;
    panel1Grades?: PanelGrades;
    panel2Grades?: PanelGrades;
    status: GradeSheetStatus;
}

export type Page = 'dashboard' | 'grading-sheet' | 'user-management' | 'masterlist' | 'group-management' | 'change-password';

// Types for the new notification system
export interface Notification {
    id: number;
    recipient_user_id: string;
    message: string;
    grade_sheet_id: string | null;
    is_read: boolean;
    created_at: string;
}

export interface ToastMessage {
    id: number; // Use notification ID for uniqueness
    message: string;
}
