import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { GradeSheet, Student, Page } from '../types';
import { EditIcon, TrashIcon } from '../components/Icons';

declare const XLSX: any;

// Modal for Adding/Editing a Group
interface GroupModalProps {
    group: Omit<GradeSheet, 'id' | 'status'> | GradeSheet | null;
    onClose: () => void;
    onSave: (group: Omit<GradeSheet, 'id' | 'status'> | GradeSheet) => void;
}

const GroupModal: React.FC<GroupModalProps> = ({ group, onClose, onSave }) => {
    const [groupName, setGroupName] = useState(group?.groupName || '');
    const [proponents, setProponents] = useState<Student[]>(group?.proponents?.length ? group.proponents : [{ id: `new_${Date.now()}`, name: '' }]);
    const [error, setError] = useState('');

    const isEditing = group && 'id' in group;

    const handleProponentChange = (index: number, name: string) => {
        const newProponents = [...proponents];
        newProponents[index] = { ...newProponents[index], name };
        setProponents(newProponents);
    };

    const addProponent = () => {
        setProponents([...proponents, { id: `new_${Date.now()}`, name: '' }]);
    };

    const removeProponent = (index: number) => {
        if (proponents.length > 1) {
            setProponents(proponents.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!groupName.trim()) {
            setError('Group name is required.');
            return;
        }

        const validProponents = proponents
            .map(p => ({ ...p, name: p.name.trim() }))
            .filter(p => p.name !== '')
            .map(p => ({ ...p, id: p.id.startsWith('new_') ? crypto.randomUUID() : p.id }));

        if (validProponents.length === 0) {
            setError('At least one proponent with a valid name is required.');
            return;
        }

        if (isEditing) {
            onSave({ ...(group as GradeSheet), groupName, proponents: validProponents });
        } else {
            const newGroup: Omit<GradeSheet, 'id' | 'status'> = {
                groupName,
                proponents: validProponents,
                proposedTitles: [],
                selectedTitle: 'Untitled Project',
                program: '',
                date: 'Not Set',
                venue: 'Not Set',
                panel1Id: '',
                panel2Id: '',
            };
            onSave(newGroup);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-4">{isEditing ? 'Edit Group' : 'Add New Group'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Group Name</label>
                        <input
                            type="text"
                            value={groupName}
                            onChange={e => setGroupName(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Proponents</label>
                        {proponents.map((proponent, index) => (
                            <div key={index} className="flex items-center space-x-2 mt-2">
                                <input
                                    type="text"
                                    placeholder={`Proponent ${index + 1} Name`}
                                    value={proponent.name}
                                    onChange={e => handleProponentChange(index, e.target.value)}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeProponent(index)}
                                    disabled={proponents.length <= 1}
                                    className="p-2 text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={addProponent}
                            className="mt-2 text-sm text-green-700 hover:text-green-900 font-medium"
                        >
                            + Add another proponent
                        </button>
                    </div>

                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <div className="flex justify-end space-x-2 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-800">Save Group</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Main Component
const GroupManagement: React.FC<{ setPage: (page: Page) => void; }> = ({ setPage }) => {
    const { gradeSheets, addGradeSheet, updateGradeSheet, deleteGradeSheet, deleteAllGradeSheets } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<GradeSheet | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);

                if (json.length === 0) {
                    alert("Spreadsheet is empty.");
                    return;
                }

                const firstRow: any = json[0];
                const groupKey = Object.keys(firstRow).find(k => k.toLowerCase().trim() === 'groupname');
                const proponentKey = Object.keys(firstRow).find(k => k.toLowerCase().trim() === 'proponentname');

                if (!groupKey || !proponentKey) {
                    alert("Spreadsheet must contain 'GroupName' and 'ProponentName' headers.");
                    return;
                }

                const groups: { [key: string]: string[] } = {};
                const errors: string[] = [];
                
                json.forEach((row: any, index: number) => {
                    const groupName = row[groupKey];
                    const proponentName = row[proponentKey];

                    if (!groupName || !proponentName) {
                        errors.push(`Row ${index + 2}: Skipped because GroupName or ProponentName is empty.`);
                        return;
                    }

                    if (!groups[groupName]) {
                        groups[groupName] = [];
                    }
                    groups[groupName].push(proponentName);
                });

                let addedCount = 0;
                Object.entries(groups).forEach(([groupName, proponents]) => {
                    if (gradeSheets.some(gs => gs.groupName.toLowerCase() === groupName.toLowerCase())) {
                        errors.push(`Group "${groupName}": Skipped because it already exists.`);
                        return;
                    }
                    const newGroup: Omit<GradeSheet, 'id' | 'status'> = {
                        groupName,
                        proponents: proponents.map(name => ({ id: crypto.randomUUID(), name })),
                        proposedTitles: [],
                        selectedTitle: 'Untitled Project',
                        program: '',
                        date: 'Not Set',
                        venue: 'Not Set',
                        panel1Id: '',
                        panel2Id: '',
                    };
                    addGradeSheet(newGroup);
                    addedCount++;
                });
                
                let alertMessage = `${addedCount} group(s) added successfully.`;
                if (errors.length > 0) {
                    alertMessage += `\n\nNotes/Errors during import:\n${errors.join('\n')}`;
                }
                alert(alertMessage);
            } catch (error) {
                alert("Failed to process the file. Please ensure it's a valid .xlsx or .csv file.");
                console.error(error);
            } finally {
                event.target.value = ''; // Reset file input
            }
        };
        reader.readAsArrayBuffer(file);
    };
    
    const handleAdd = () => {
        setEditingGroup(null);
        setIsModalOpen(true);
    };

    const handleEdit = (group: GradeSheet) => {
        setEditingGroup(group);
        setIsModalOpen(true);
    };

    const handleDelete = (groupId: string) => {
        if (window.confirm('Are you sure you want to delete this group? This will also delete all associated grades.')) {
            deleteGradeSheet(groupId);
        }
    };

    const handleDeleteAll = () => {
        const confirmation = window.prompt(
            'WARNING: This will permanently ERASE all groups and their associated grades from the database. This action cannot be undone.\n\nTo confirm, type "DELETE ALL" in the box below.'
        );
        if (confirmation === 'DELETE ALL') {
            deleteAllGradeSheets();
        } else {
            alert('Delete all operation cancelled.');
        }
    };

    const handleSave = (data: Omit<GradeSheet, 'id' | 'status'> | GradeSheet) => {
        if ('id' in data) {
            updateGradeSheet(data);
        } else {
            addGradeSheet(data);
        }
    };

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Group Management</h2>
                <button onClick={handleAdd} className="px-4 py-2 bg-green-700 text-white font-medium rounded-md hover:bg-green-800">
                    Add New Group
                </button>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-x-auto mb-8">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-sm font-medium text-gray-800 uppercase tracking-wider">Group Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-sm font-medium text-gray-800 uppercase tracking-wider">Proponents</th>
                            <th scope="col" className="px-6 py-3 text-right text-sm font-medium text-gray-800 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {gradeSheets.length > 0 ? (
                            gradeSheets.map(group => (
                                <tr key={group.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-base font-medium text-black">{group.groupName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-base text-black">
                                        {group.proponents.map(p => p.name).join(', ')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button onClick={() => handleEdit(group)} className="text-green-700 hover:text-green-900 p-1" aria-label={`Edit ${group.groupName}`}><EditIcon className="w-5 h-5"/></button>
                                        <button onClick={() => handleDelete(group.id)} className="text-red-600 hover:text-red-900 p-1" aria-label={`Delete ${group.groupName}`}><TrashIcon className="w-5 h-5"/></button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={3} className="px-6 py-10 text-center text-gray-500">
                                    No groups found. Click 'Add New Group' to get started.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h3 className="text-xl font-bold text-black mb-2">Bulk Add Groups</h3>
                <p className="text-base text-black mb-4">Add multiple groups by uploading an XLSX or CSV file.</p>
                <input
                    type="file"
                    id="group-file-upload"
                    className="hidden"
                    accept=".xlsx, .csv"
                    onChange={handleFileChange}
                />
                <label htmlFor="group-file-upload" className="w-full cursor-pointer flex justify-center px-6 py-10 border-2 border-gray-300 border-dashed rounded-md hover:border-green-500">
                    <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                        <p className="mt-1 text-sm text-gray-600">
                            <span className="font-medium text-green-700">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">XLSX, CSV up to 10MB</p>
                    </div>
                </label>
                <div className="mt-4 text-sm text-gray-800 bg-gray-50 p-3 rounded-md">
                    <p className="font-bold text-black mb-1">Spreadsheet Requirements:</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li>Must have a header row with columns named <span className="font-mono bg-gray-200 px-1 rounded">GroupName</span> and <span className="font-mono bg-gray-200 px-1 rounded">ProponentName</span>.</li>
                        <li>Each row represents one proponent belonging to a group.</li>
                        <li>Rows with the same <span className="font-mono bg-gray-200 px-1 rounded">GroupName</span> will be merged into a single group.</li>
                    </ul>
                </div>
            </div>
            
            <div className="border-2 border-red-500 rounded-lg p-6">
                <h3 className="text-2xl font-bold text-red-700 mb-4">Danger Zone</h3>
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                    <h4 className="text-lg font-bold text-red-800">Delete All Groups & Grades</h4>
                    <p className="text-base text-red-900 mt-2 mb-4">
                        <span className="font-bold">Warning:</span> This will permanently delete all group and grading data from the system. This action cannot be undone and does not affect user accounts.
                    </p>
                    <div className="text-right">
                        <button onClick={handleDeleteAll} className="px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700">
                            Delete All Groups...
                        </button>
                    </div>
                </div>
            </div>

            {isModalOpen && <GroupModal group={editingGroup} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
        </div>
    );
};

export default GroupManagement;
