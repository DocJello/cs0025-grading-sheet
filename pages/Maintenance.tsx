import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

const Maintenance: React.FC = () => {
    const { users, gradeSheets, restoreData, resetAllGrades, deleteAllGradeSheets, deleteAllNonAdminUsers } = useAppContext();
    const [restoreFile, setRestoreFile] = useState<File | null>(null);
    const [showModal, setShowModal] = useState<string | null>(null);
    const [confirmationText, setConfirmationText] = useState('');

    const modals = {
        resetGrades: {
            title: 'Confirm Reset All Grades',
            description: "This will remove all submitted scores and comments from every group, resetting their status to 'Not Started'. The groups and panel assignments themselves will NOT be deleted.",
            prompt: 'RESET GRADES',
            action: async () => {
                await resetAllGrades();
                alert('All grades have been reset successfully.');
            }
        },
        deleteGroups: {
            title: 'Confirm Permanent Deletion',
            description: "Permanently delete ALL groups, proponents, panel assignments, and submitted grades from the system. This action cannot be undone.",
            prompt: 'DELETE GROUPS',
            action: async () => {
                await deleteAllGradeSheets();
                alert('All groups and grade sheets have been successfully deleted.');
            }
        },
        deleteUsers: {
            title: 'Confirm Permanent Deletion',
            description: "Permanently delete ALL users with the role 'Course Adviser' or 'Panel'. Administrator accounts will NOT be affected. This action cannot be undone.",
            prompt: 'DELETE USERS',
            action: async () => {
                await deleteAllNonAdminUsers();
                alert('All non-admin users have been successfully deleted.');
            }
        }
    };

    const activeModal = showModal ? modals[showModal as keyof typeof modals] : null;

    const handleConfirmation = async () => {
        if (!activeModal) return;
        try {
            await activeModal.action();
        } catch (error) {
            alert(`An error occurred: ${(error as Error).message}`);
        } finally {
            setShowModal(null);
            setConfirmationText('');
        }
    };

    const handleExport = (data: any, filename: string) => {
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
            JSON.stringify(data, null, 2)
        )}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = filename;
        link.click();
    };

    const handleFullBackup = () => {
        const backupData = {
            users,
            gradeSheets,
        };
        handleExport(backupData, `grading-sheet-backup-${new Date().toISOString().split('T')[0]}.json`);
    };

    const handleRestoreFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        setRestoreFile(file);
    };

    const handleRestore = async () => {
        if (!restoreFile) {
            alert('Please select a backup file to restore.');
            return;
        }
        const confirmation = window.prompt(
            'WARNING: This will ERASE all current data (users, groups, grades) and replace it with the backup. This is irreversible.\n\nTo confirm, type "RESTORE" in the box below.'
        );
        if (confirmation !== 'RESTORE') {
            alert('Restore operation cancelled.');
            return;
        }
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                const backupData = JSON.parse(text);
                if (!backupData.users || !Array.isArray(backupData.users) || !backupData.gradeSheets || !Array.isArray(backupData.gradeSheets)) {
                    throw new Error("Invalid backup file format. Missing 'users' or 'gradeSheets' arrays.");
                }
                await restoreData(backupData);
                alert('Data restored successfully! The application will now reload to apply the changes.');
                window.location.reload();
            } catch (err) {
                console.error("Restore failed:", err);
                alert(`Error processing backup file: ${(err as Error).message}`);
            }
        };
        reader.readAsText(restoreFile);
    };

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">System Maintenance</h2>
            <div className="p-6 rounded-lg shadow-md bg-white">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">System Backup & Restore</h3>

                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md mb-6">
                    <h4 className="text-lg font-bold text-blue-800">Full System Backup</h4>
                    <p className="text-base text-blue-900 mt-2 mb-4">
                        Download a full backup of all users, groups, and grades as a single JSON file. This includes all scores, comments, and panel assignments. Keep this file in a safe place.
                    </p>
                    <button onClick={handleFullBackup} className="px-4 py-2 bg-blue-700 text-white font-medium rounded-md hover:bg-blue-800">
                        Download Full Backup (.json)
                    </button>
                </div>

                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-md">
                    <h4 className="text-lg font-bold text-yellow-800">Restore from Backup</h4>
                    <p className="text-base text-yellow-900 mt-2 mb-4">
                        <span className="font-bold">Warning:</span> Restoring from a backup will completely overwrite all existing users and grade sheets in the database. This action cannot be undone.
                    </p>
                    <div className="flex items-center space-x-4">
                        <input
                            type="file"
                            id="restore-file-upload"
                            className="block w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 cursor-pointer focus:outline-none"
                            accept=".json"
                            onChange={handleRestoreFileChange}
                        />
                        <button onClick={handleRestore} disabled={!restoreFile} className="flex-shrink-0 px-4 py-2 bg-yellow-600 text-white font-medium rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed">
                            Restore Data
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-8">
                <div className="border-2 border-red-500 rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-red-700 mb-4">Danger Zone</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Reset Grades */}
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                            <h4 className="text-lg font-bold text-red-800">Reset All Grades</h4>
                            <p className="text-sm text-red-900 mt-2 mb-4">
                                Wipes all scores and comments but keeps groups and assignments. Useful for re-grading.
                            </p>
                            <button onClick={() => setShowModal('resetGrades')} className="w-full px-4 py-2 bg-red-700 text-white font-medium rounded-md hover:bg-red-800">
                                Reset All Grades...
                            </button>
                        </div>

                        {/* Delete All Groups */}
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                            <h4 className="text-lg font-bold text-red-800">Delete All Groups & Grades</h4>
                            <p className="text-sm text-red-900 mt-2 mb-4">
                                Permanently deletes all group data, including proponents, grades, and assignments.
                            </p>
                            <button onClick={() => setShowModal('deleteGroups')} className="w-full px-4 py-2 bg-red-700 text-white font-medium rounded-md hover:bg-red-800">
                                Delete All Groups...
                            </button>
                        </div>
                        
                        {/* Delete All Users */}
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                            <h4 className="text-lg font-bold text-red-800">Delete All Non-Admin Users</h4>
                            <p className="text-sm text-red-900 mt-2 mb-4">
                                Permanently deletes all Course Adviser and Panel accounts. Admin accounts are not affected.
                            </p>
                            <button onClick={() => setShowModal('deleteUsers')} className="w-full px-4 py-2 bg-red-700 text-white font-medium rounded-md hover:bg-red-800">
                                Delete All Users...
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            {activeModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold text-red-700 mb-4">{activeModal.title}</h3>
                        <p className="mb-4 text-sm text-gray-700">{activeModal.description}</p>
                        <p className="mb-4 text-sm text-gray-700">
                            Please type <strong className="font-mono bg-red-100 text-red-800 px-1 rounded">{activeModal.prompt}</strong> to confirm.
                        </p>
                        <input
                            type="text"
                            value={confirmationText}
                            onChange={(e) => setConfirmationText(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                        />
                        <div className="flex justify-end space-x-2 pt-4 mt-2">
                            <button type="button" onClick={() => {setShowModal(null); setConfirmationText('');}} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                onClick={handleConfirmation}
                                disabled={confirmationText !== activeModal.prompt}
                                className="px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Maintenance;
