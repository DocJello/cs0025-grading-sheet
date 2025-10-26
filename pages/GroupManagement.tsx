// FIX: Full content for pages/GroupManagement.tsx
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { GradeSheet, Page, Student, User } from '../types';
import { EditIcon, TrashIcon, InfoIcon } from '../components/Icons';

declare const XLSX: any; // From SheetJS CDN

interface GroupModalProps {
    sheet: Omit<GradeSheet, 'id' | 'status'> | GradeSheet | null;
    onClose: () => void;
    onSave: (data: Omit<GradeSheet, 'id' | 'status'> | GradeSheet) => void;
    venues: string[];
    addVenue: (venue: string) => void;
}

const GroupModal: React.FC<GroupModalProps> = ({ sheet, onClose, onSave, venues, addVenue }) => {
    const [groupName, setGroupName] = useState(sheet?.groupName || '');
    const [proponents, setProponents] = useState(sheet?.proponents.map(p => p.name).join('; ') || '');
    const [selectedTitle, setSelectedTitle] = useState(sheet?.selectedTitle || '');
    const [program, setProgram] = useState(sheet?.program || '');
    const [date, setDate] = useState(sheet?.date || '');
    const [venue, setVenue] = useState(sheet?.venue || '');
    const [newVenue, setNewVenue] = useState('');
    const [showNewVenueInput, setShowNewVenueInput] = useState(false);

    useEffect(() => {
        // If editing an existing sheet and its venue isn't in the standard list,
        // set the dropdown to 'Others' and populate the text input.
        if (sheet?.venue && !venues.includes(sheet.venue)) {
            setVenue('Others');
            setShowNewVenueInput(true);
            setNewVenue(sheet.venue);
        }
    }, [sheet, venues]);


    const handleVenueChange = (selectedVenue: string) => {
        setVenue(selectedVenue);
        if (selectedVenue === 'Others') {
            setShowNewVenueInput(true);
        } else {
            setShowNewVenueInput(false);
            setNewVenue(''); // Clear custom venue when a standard one is selected
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const proponentList: Student[] = proponents
            .split(';')
            .map(name => name.trim())
            .filter(name => name)
            .map((name, index) => ({ id: sheet?.proponents[index]?.id || `s_new_${index}_${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, name }));
            
        let finalVenue = venue;
        if (venue === 'Others' && newVenue.trim()) {
            finalVenue = newVenue.trim();
            addVenue(finalVenue); // Add to the list for future use
        }

        const baseData = {
            groupName,
            proponents: proponentList,
            proposedTitles: sheet?.proposedTitles || [], // Keep existing or default
            selectedTitle,
            program: program as GradeSheet['program'],
            date,
            venue: finalVenue,
            panel1Id: sheet?.panel1Id || '',
            panel2Id: sheet?.panel2Id || '',
        };

        if (sheet && 'id' in sheet) {
            onSave({ ...sheet, ...baseData });
        } else {
            onSave(baseData);
        }
        
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-4">{sheet && 'id' in sheet ? 'Edit Group Details' : 'Add Group Manually'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Group Name</label>
                        <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Program</label>
                        <select value={program} onChange={e => setProgram(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500">
                            <option value="" disabled>Select a program</option>
                            <option value="BSCS-AI">BSCS-AI</option>
                            <option value="BSCS-DS">BSCS-DS</option>
                            <option value="BSCS-SE">BSCS-SE</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Proponents (semicolon-separated; 3-4 members)</label>
                        <input type="text" value={proponents} onChange={e => setProponents(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Project Title</label>
                        <input type="text" value={selectedTitle} onChange={e => setSelectedTitle(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"/>
                    </div>
                    <div className="flex space-x-4">
                        <div className="flex-1">
                             <label className="block text-sm font-medium text-gray-700">Date / Time</label>
                            <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"/>
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700">Venue</label>
                             <select value={venue} onChange={e => handleVenueChange(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500">
                                <option value="" disabled>Select a venue</option>
                                {venues.map(v => <option key={v} value={v}>{v}</option>)}
                                <option value="Others">Others</option>
                            </select>
                            {showNewVenueInput && (
                                <input 
                                    type="text" 
                                    placeholder="Enter new venue" 
                                    value={newVenue} 
                                    onChange={e => setNewVenue(e.target.value)} 
                                    className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                                    required={venue === 'Others'}
                                />
                            )}
                        </div>
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-800">Save Group</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface GroupManagementProps {
    setPage: (page: Page) => void;
}

const GroupManagement: React.FC<GroupManagementProps> = ({ setPage }) => {
    const { users, gradeSheets, addGradeSheet, updateGradeSheet, deleteGradeSheet, deleteAllGradeSheets, venues, addVenue, restoreData } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSheet, setEditingSheet] = useState<GradeSheet | null>(null);
    const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
    const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
    const [restoreFile, setRestoreFile] = useState<File | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (json.length < 2) {
                alert("Spreadsheet is empty or has no data rows.");
                return;
            }
            
            const headers: string[] = json[0] as string[];
            const groupNameIndex = headers.findIndex(h => h.toLowerCase().replace(/\s/g, '') === 'groupname');

            if (groupNameIndex === -1) {
                alert("Could not find 'Group Name' or 'GroupName' column header.");
                return;
            }

            const programIndex = headers.findIndex(h => h.toLowerCase() === 'program');

            // --- Start of Duplicate Prevention Logic ---
            // Create sets for case-insensitive checking of existing data
            const existingGroupNames = new Set(gradeSheets.map(gs => gs.groupName.trim().toLowerCase()));
            const allExistingStudents = new Set<string>();
            gradeSheets.forEach(sheet => {
                sheet.proponents.forEach(proponent => {
                    allExistingStudents.add(proponent.name.trim().toLowerCase());
                });
            });
            // --- End of Duplicate Prevention Logic ---

            let addedCount = 0;
            const errors: string[] = [];

            for (let i = 1; i < json.length; i++) {
                const row: any[] = json[i] as any[];
                if (!row.some(cell => cell)) continue; // Skip empty rows

                const groupName = row[groupNameIndex];
                if (!groupName) {
                    errors.push(`Row ${i + 1}: Skipped because Group Name is empty.`);
                    continue;
                }
                
                // 1. Check for duplicate group name (case-insensitive)
                if (existingGroupNames.has(groupName.trim().toLowerCase())) {
                     errors.push(`Row ${i + 1}: Skipped because group "${groupName}" already exists.`);
                    continue;
                }

                const proponents = row.slice(groupNameIndex + 1, groupNameIndex + 5)
                                      .map(name => typeof name === 'string' ? name.trim() : String(name).trim())
                                      .filter(name => name);

                if (proponents.length < 3 || proponents.length > 4) {
                    errors.push(`Row ${i + 1}: Skipped because group "${groupName}" has ${proponents.length} proponents (must be 3 or 4).`);
                    continue;
                }

                // 2. Check for duplicate students (case-insensitive)
                let duplicateStudentFound = false;
                for (const proponentName of proponents) {
                    if (allExistingStudents.has(proponentName.toLowerCase())) {
                        errors.push(`Row ${i + 1}: Skipped group "${groupName}" because student "${proponentName}" already exists in another group.`);
                        duplicateStudentFound = true;
                        break;
                    }
                }

                if (duplicateStudentFound) {
                    continue;
                }

                const newSheet: Omit<GradeSheet, 'id' | 'status'> = {
                    groupName,
                    proponents: proponents.map((name, index) => ({ id: `s_upload_${i}_${index}_${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, name })),
                    program: (row[programIndex] || '') as GradeSheet['program'],
                    selectedTitle: 'Untitled Project',
                    proposedTitles: [],
                    date: 'Not Set',
                    venue: 'Not Set',
                    panel1Id: '',
                    panel2Id: '',
                };
                addGradeSheet(newSheet);
                addedCount++;
                
                // Add the newly added group and students to our sets for checks within the same file
                existingGroupNames.add(groupName.trim().toLowerCase());
                proponents.forEach(p => allExistingStudents.add(p.toLowerCase()));
            }
            
            let alertMessage = `${addedCount} group(s) added successfully.`;
            if (errors.length > 0) {
                alertMessage += `\n\nErrors during import:\n${errors.join('\n')}`;
            }
            alert(alertMessage);
            event.target.value = ''; // Reset file input
            setPage('masterlist');
        };
        reader.readAsArrayBuffer(file);
    };

    const handleAdd = () => {
        setEditingSheet(null);
        setIsModalOpen(true);
    };

    const handleEdit = (sheet: GradeSheet) => {
        setEditingSheet(sheet);
        setIsModalOpen(true);
    };

    const handleDelete = (sheetId: string) => {
        if (window.confirm('Are you sure you want to delete this group? All associated data will be lost.')) {
            deleteGradeSheet(sheetId);
        }
    };
    
    const handleSave = (data: Omit<GradeSheet, 'id' | 'status'> | GradeSheet) => {
        if ('id' in data) {
            updateGradeSheet(data);
        } else {
            addGradeSheet(data);
        }
    };

    const handleDeleteAllSheets = async () => {
        await deleteAllGradeSheets();
        alert('All grade sheets have been successfully deleted.');
        setShowDeleteAllModal(false);
        setDeleteConfirmationText('');
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
        reader.onerror = () => {
            alert('Failed to read the selected file.');
        };
        reader.readAsText(restoreFile);
    };


    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
             <h2 className="text-3xl font-bold text-gray-800 mb-6">Group Management</h2>

            <div className="flex flex-col lg:flex-row gap-8 mb-8">
                 {/* Left Column: Group Listings */}
                <div className="flex-1 bg-white p-6 rounded-lg shadow-md">
                     <h3 className="text-xl font-bold text-gray-800 mb-2">Group Listings</h3>
                    <p className="text-base text-gray-800 mb-4">Add, edit, or delete groups manually from the list below.</p>
                     <button onClick={handleAdd} className="w-full mb-4 px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-800">
                        Add New Group Manually
                    </button>
                    <div className="overflow-y-auto max-h-96">
                        {gradeSheets.length > 0 ? (
                            <ul className="divide-y divide-gray-200">
                                {gradeSheets.map(sheet => (
                                    <li key={sheet.id} className="py-3 flex items-center justify-between">
                                        <div>
                                            <p className="text-base font-medium text-black">{sheet.groupName}</p>
                                            <p className="text-sm text-gray-800">{sheet.proponents.length} members</p>
                                        </div>
                                        <div className="space-x-2">
                                            <button onClick={() => handleEdit(sheet)} className="text-green-700 hover:text-green-900 p-1"><EditIcon className="w-5 h-5"/></button>
                                            <button onClick={() => handleDelete(sheet.id)} className="text-red-600 hover:text-red-900 p-1"><TrashIcon className="w-5 h-s"/></button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-gray-700 py-4 text-base">No groups created yet.</p>
                        )}
                    </div>
                </div>

                {/* Right Column: Bulk Add Groups */}
                <div className="flex-1 bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Bulk Add Groups</h3>
                    <p className="text-base text-gray-800 mb-4">Create multiple groups by uploading an XLSX or CSV file.</p>
                     <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        accept=".xlsx, .csv"
                        onChange={handleFileChange}
                    />
                    <label htmlFor="file-upload" className="w-full cursor-pointer flex justify-center px-6 py-10 border-2 border-gray-300 border-dashed rounded-md hover:border-green-500">
                        <div className="text-center">
                            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                            <p className="mt-1 text-sm text-gray-600">
                                <span className="font-medium text-green-700">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-gray-500">XLSX, CSV up to 10MB</p>
                        </div>
                    </label>
                    <div className="mt-4 text-xs text-gray-600 bg-gray-50 p-3 rounded-md">
                        <p className="font-bold mb-1">Spreadsheet Requirements:</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Must have a header row.</li>
                            <li>A column named <span className="font-mono bg-gray-200 px-1 rounded">GroupName</span> or <span className="font-mono bg-gray-200 px-1 rounded">Group Name</span> is required.</li>
                            <li>The 3-4 columns immediately following the group name will be treated as proponents.</li>
                            <li>An optional <span className="font-mono bg-gray-200 px-1 rounded">Program</span> column is supported.</li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <div className="p-6 rounded-lg shadow-md bg-white mt-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">System Administration</h3>
                {/* Backup Section */}
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md mb-6">
                    <h4 className="text-lg font-bold text-blue-800">Full System Backup</h4>
                    <p className="text-base text-blue-900 mt-2 mb-4">
                        Download a full backup of all users, groups, and grades as a single JSON file. This includes all scores, comments, and panel assignments. Keep this file in a safe place.
                    </p>
                    <button onClick={handleFullBackup} className="px-4 py-2 bg-blue-700 text-white font-medium rounded-md hover:bg-blue-800">
                        Download Full Backup (.json)
                    </button>
                </div>
                
                <div className="border-t-2 border-gray-200 my-6 pt-6">
                    <div className="border-2 border-red-500 rounded-lg p-6">
                        <h3 className="text-2xl font-bold text-red-700 mb-4">Danger Zone</h3>
                        
                        {/* Restore */}
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md mb-6">
                            <h4 className="text-lg font-bold text-red-800">Restore from Backup</h4>
                            <p className="text-base text-red-900 mt-2 mb-4">
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
                                <button onClick={handleRestore} disabled={!restoreFile} className="flex-shrink-0 px-4 py-2 bg-red-700 text-white font-medium rounded-md hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed">
                                    Restore Data
                                </button>
                            </div>
                        </div>

                        {/* Delete All */}
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                            <h4 className="text-lg font-bold text-red-800">Delete All Grade Sheets</h4>
                            <p className="text-base text-red-900 mt-2 mb-4">
                                Permanently delete all grade sheets, panel assignments, and submitted grades from the system. This action cannot be undone and is useful for cleaning up at the end of a semester. Users will not be affected.
                            </p>
                            <button onClick={() => setShowDeleteAllModal(true)} className="px-4 py-2 bg-red-700 text-white font-medium rounded-md hover:bg-red-800">
                                Delete All Grade Sheets...
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {isModalOpen && <GroupModal sheet={editingSheet} onClose={() => setIsModalOpen(false)} onSave={handleSave} venues={venues} addVenue={addVenue} />}

            {showDeleteAllModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold text-red-700 mb-4">Confirm Permanent Deletion</h3>
                        <p className="mb-4 text-sm text-gray-700">
                            This will permanently delete ALL grade sheets and their associated grades. This action cannot be undone.
                        </p>
                        <p className="mb-4 text-sm text-gray-700">
                            Please type <strong className="font-mono bg-red-100 text-red-800 px-1 rounded">DELETE ALL</strong> to confirm.
                        </p>
                        <input
                            type="text"
                            value={deleteConfirmationText}
                            onChange={(e) => setDeleteConfirmationText(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                        />
                        <div className="flex justify-end space-x-2 pt-4 mt-2">
                            <button type="button" onClick={() => {setShowDeleteAllModal(false); setDeleteConfirmationText('');}} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                onClick={handleDeleteAllSheets}
                                disabled={deleteConfirmationText !== 'DELETE ALL'}
                                className="px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Delete Everything
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GroupManagement;
