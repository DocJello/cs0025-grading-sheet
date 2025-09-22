import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { User, UserRole } from '../types';
import { USER_ROLES } from '../constants';
import { EditIcon, TrashIcon } from '../components/Icons';

// FIX: Declare XLSX from SheetJS CDN to resolve TypeScript errors.
declare const XLSX: any;

interface UserModalProps {
    user: User | null;
    onClose: () => void;
    onSave: (user: User & { password?: string }) => void;
    apiError: string;
}

const UserModal: React.FC<UserModalProps> = ({ user, onClose, onSave, apiError }) => {
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [role, setRole] = useState(user?.role || UserRole.PANEL);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { areAdminFunctionsConfigured } = useAppContext();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!user && password.length < 8) {
            setError('New user password must be at least 8 characters long.');
            return;
        }
        if (password && password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setIsLoading(true);
        const userData = { id: user?.id || '', name, email, role, ...(password && { password }) };
        
        try {
           await onSave(userData as User & { password?: string });
           onClose();
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">{user ? 'Edit User' : 'Add New User'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><label className="block text-sm font-medium text-gray-700">Full Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"/></div>
                    <div><label className="block text-sm font-medium text-gray-700">Email Address</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"/></div>
                    <div><label className="block text-sm font-medium text-gray-700">Role</label><select value={role} onChange={(e) => setRole(e.target.value as UserRole)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500">{USER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                    <div><label className="block text-sm font-medium text-gray-700">Password {user ? '(leave blank to keep current)' : ''}</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!user} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"/></div>
                    <div><label className="block text-sm font-medium text-gray-700">Confirm Password</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required={!user || !!password} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"/></div>
                    {(error || apiError) && <p className="text-sm text-red-600">{error || apiError}</p>}
                     {!areAdminFunctionsConfigured && (
                        <p className="text-sm text-yellow-600">Admin function IDs are not configured. Please contact the developer.</p>
                     )}
                    <div className="flex justify-end space-x-2 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                        <button type="submit" disabled={!areAdminFunctionsConfigured || isLoading} className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-800 disabled:bg-gray-400">{isLoading ? 'Saving...' : 'Save User'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const UserManagement: React.FC = () => {
    const { users, addUser, updateUser, deleteUser, areAdminFunctionsConfigured } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [apiError, setApiError] = useState('');

    const handleAdd = () => { setEditingUser(null); setIsModalOpen(true); setApiError(''); };
    const handleEdit = (user: User) => { setEditingUser(user); setIsModalOpen(true); setApiError(''); };
    
    const handleDelete = async (userId: string) => {
        if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            try { setApiError(''); await deleteUser(userId); } 
            catch (err: any) { setApiError(err.message || 'Failed to delete user.'); }
        }
    };

    const handleSave = async (data: User & { password?: string }) => {
        setApiError('');
        try {
            if (editingUser) await updateUser({ ...data, id: editingUser.id });
            else await addUser(data);
            setIsModalOpen(false);
        } catch (err: any) {
            setApiError(err.message || `Failed to ${editingUser ? 'update' : 'add'} user.`);
            throw err; 
        }
    };
    
    const [showSummary, setShowSummary] = useState(false);
    const [summary, setSummary] = useState({ success: 0, errors: [] as string[] });

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json: any[] = XLSX.utils.sheet_to_json(worksheet);

            let successCount = 0;
            const errorMessages: string[] = [];

            for (const [index, row] of json.entries()) {
                const name = row.Name || row.name;
                const email = row.Email || row.email;
                let role = row.Role || row.role;

                if (!name || !email || !role) {
                    errorMessages.push(`Row ${index + 2}: Skipped due to missing Name, Email, or Role.`);
                    continue;
                }
                
                if (!USER_ROLES.includes(role)) {
                    errorMessages.push(`Row ${index + 2}: Skipped due to invalid role "${role}" for user ${name}.`);
                    continue;
                }

                try {
                    await addUser({ name, email, role, password: Math.random().toString(36).slice(-8) });
                    successCount++;
                } catch (err: any) {
                    errorMessages.push(`Row ${index + 2}: Failed to add ${name} - ${err.message}`);
                }
            }
            setSummary({ success: successCount, errors: errorMessages });
            setShowSummary(true);
        };
        reader.readAsArrayBuffer(file);
        event.target.value = '';
    };

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">User Management</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow-md">
                     <h3 className="text-xl font-bold text-gray-800 mb-2">Bulk Add Users</h3>
                     <p className="text-sm text-gray-600 mb-4">Add multiple users by uploading a spreadsheet.</p>
                     <input type="file" id="user-upload" className="hidden" accept=".xlsx, .csv" onChange={handleFileChange} disabled={!areAdminFunctionsConfigured}/>
                    <label htmlFor="user-upload" className={`w-full flex justify-center px-6 py-10 border-2 border-dashed rounded-md ${!areAdminFunctionsConfigured ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer border-gray-300 hover:border-green-500'}`}>
                        <div className="text-center">
                            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                            <p className="mt-1 text-sm text-gray-600"><span className="font-medium text-green-700">Click to upload</span></p><p className="text-xs text-gray-500">XLSX, CSV</p>
                        </div>
                    </label>
                    <div className="mt-4 text-xs text-gray-600 bg-gray-50 p-3 rounded-md">
                        <p className="font-bold mb-1">Spreadsheet Requirements:</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Must have a header row with columns: `Name`, `Email`, `Role`.</li>
                            <li>New users will be assigned a random 8-character password.</li>
                            <li>Valid roles are: 'Admin', 'Course Adviser', 'Panel'.</li>
                        </ul>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-gray-800">Manage Users Manually</h3>
                         <button onClick={handleAdd} disabled={!areAdminFunctionsConfigured} className="px-4 py-2 bg-green-700 text-white text-sm font-medium rounded-md hover:bg-green-800 disabled:opacity-50">Add New User</button>
                    </div>
                    <div className="overflow-y-auto max-h-96">
                        <table className="min-w-full divide-y divide-gray-200">
                           <thead className="bg-gray-50 sticky top-0"><tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th><th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th></tr></thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.map((user) => (
                                    <tr key={user.id}><td className="px-4 py-3 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{user.name}</div><div className="text-xs text-gray-500">{user.email}</div></td><td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{user.role}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                            <button onClick={() => handleEdit(user)} className="text-green-600 hover:text-green-900 disabled:text-gray-400" disabled={!areAdminFunctionsConfigured}><EditIcon className="w-5 h-5"/></button>
                                            <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-900 disabled:text-gray-400" disabled={!areAdminFunctionsConfigured}><TrashIcon className="w-5 h-5"/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {!areAdminFunctionsConfigured && (<div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mt-8" role="alert"><p className="font-bold">Admin Functions Not Configured</p><p>User management features are disabled. Please configure the Appwrite Function IDs in `context/AppContext.tsx` to enable them.</p></div>)}
            {apiError && !isModalOpen && (<div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mt-8" role="alert"><p className="font-bold">An Error Occurred</p><p>{apiError}</p></div>)}

            {isModalOpen && <UserModal user={editingUser} onClose={() => setIsModalOpen(false)} onSave={handleSave} apiError={apiError}/>}
            
            {showSummary && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
                        <h2 className="text-2xl font-bold mb-4">Bulk Import Summary</h2>
                        <p className="text-green-600 font-semibold">{summary.success} user(s) added successfully.</p>
                        {summary.errors.length > 0 && (
                            <div className="mt-4">
                                <p className="text-red-600 font-semibold">{summary.errors.length} error(s) occurred:</p>
                                <ul className="list-disc list-inside text-sm text-red-700 mt-2 bg-red-50 p-3 rounded-md max-h-60 overflow-y-auto">
                                    {summary.errors.map((err, i) => <li key={i}>{err}</li>)}
                                </ul>
                            </div>
                        )}
                        <div className="text-right mt-6">
                            <button type="button" onClick={() => setShowSummary(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;