// FIX: Full, corrected content for UserManagement.tsx to implement user management functionality.
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { User, UserRole } from '../types';
import { USER_ROLES } from '../constants';
import { EditIcon, TrashIcon } from '../components/Icons';

interface UserModalProps {
    user: User | null;
    onClose: () => void;
    onSave: (user: User & { password?: string }) => void;
}

const UserModal: React.FC<UserModalProps> = ({ user, onClose, onSave }) => {
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [role, setRole] = useState(user?.role || UserRole.PANEL);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!user && password.length < 8) {
            setError('Password must be at least 8 characters long for new users.');
            return;
        }

        const userData = {
            id: user?.id || '', // id will be ignored for new users
            name,
            email,
            role,
            ...(password && { password }),
        };
        onSave(userData as User & { password?: string });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">{user ? 'Edit User' : 'Add New User'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Full Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Role</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as UserRole)}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                        >
                            {USER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Password {user ? '(leave blank to keep current)' : ''}
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required={!user}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                        />
                         {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-800">Save User</button>
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

    const handleAdd = () => {
        setEditingUser(null);
        setIsModalOpen(true);
        setApiError('');
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setIsModalOpen(true);
        setApiError('');
    };

    const handleDelete = async (userId: string) => {
        if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            try {
                setApiError('');
                await deleteUser(userId);
            } catch (err: any) {
                setApiError(err.message || 'Failed to delete user.');
            }
        }
    };

    const handleSave = async (data: User & { password?: string }) => {
        try {
            setApiError('');
            if (editingUser) {
                await updateUser({ ...data, id: editingUser.id });
            } else {
                const { id, ...newUser } = data; // remove id property for new user
                await addUser(newUser);
            }
        } catch (err: any) {
            setApiError(err.message || `Failed to ${editingUser ? 'update' : 'add'} user.`);
        }
    };

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">User Management</h2>
                <button
                    onClick={handleAdd}
                    className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-800 disabled:opacity-50"
                    disabled={!areAdminFunctionsConfigured}
                >
                    Add New User
                </button>
            </div>

            {!areAdminFunctionsConfigured && (
                 <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
                    <p className="font-bold">Admin Functions Not Configured</p>
                    <p>User management features (add, edit, delete) are disabled. Please configure the Appwrite Function IDs in <code>context/AppContext.tsx</code> to enable them.</p>
                </div>
            )}

            {apiError && (
                 <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
                    <p className="font-bold">An Error Occurred</p>
                    <p>{apiError}</p>
                </div>
            )}

            <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.role}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                    <button onClick={() => handleEdit(user)} className="text-green-600 hover:text-green-900 disabled:text-gray-400" disabled={!areAdminFunctionsConfigured}><EditIcon className="w-5 h-5"/></button>
                                    <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-900 disabled:text-gray-400" disabled={!areAdminFunctionsConfigured}><TrashIcon className="w-5 h-5"/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && <UserModal user={editingUser} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
        </div>
    );
};

export default UserManagement;
