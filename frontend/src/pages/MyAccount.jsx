import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Phone, Mail, Save, Loader, Lock, X, Camera, Shield } from 'lucide-react';
import Toast from '../components/common/Toast';
import MyAccountSkeleton from '../components/skeletons/MyAccountSkeleton';

export default function MyAccount() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState({
        full_name: '',
        mobile_number: '',
    });
    const [toast, setToast] = useState(null);

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [updatingPassword, setUpdatingPassword] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    useEffect(() => {
        let mounted = true;

        // Failsafe: Force stop loading after 3 seconds
        const safetyTimer = setTimeout(() => {
            if (mounted) {
                setLoading((prev) => {
                    if (prev) {
                        console.warn("My Account profile fetch timed out safely.");
                        return false;
                    }
                    return prev;
                });
            }
        }, 3000);

        const getProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (mounted) setUser(user);

                if (user) {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single();

                    if (error && error.code !== 'PGRST116') {
                        throw error;
                    }

                    if (data && mounted) {
                        setProfile({
                            full_name: data.full_name || '',
                            mobile_number: data.mobile_number || '',
                        });
                    }
                }
            } catch (error) {
                console.error('Error loading profile:', error.message);
            } finally {
                if (mounted) {
                    clearTimeout(safetyTimer);
                    setLoading(false);
                }
            }
        };

        getProfile();

        return () => {
            mounted = false;
            clearTimeout(safetyTimer);
        };
    }, []);

    const handleChange = (e) => {
        setProfile({ ...profile, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            // Use upsert to handle cases where the profile row might not exist yet
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    email: user.email,
                    full_name: profile.full_name,
                    mobile_number: profile.mobile_number,
                });

            if (error) throw error;
            setToast({ message: 'Profile updated successfully!', type: 'success' });
        } catch (error) {
            console.error('Error updating profile:', error.message);
            setToast({ message: `Error updating profile: ${error.message}`, type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setToast({ message: "Passwords don't match!", type: 'error' });
            return;
        }

        if (passwordData.newPassword.length < 6) {
            setToast({ message: "Password must be at least 6 characters.", type: 'error' });
            return;
        }

        setUpdatingPassword(true);
        try {
            // 1. Verify Current Password
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: passwordData.currentPassword
            });

            if (signInError) {
                if (signInError.message.includes("Invalid login credentials")) {
                    throw new Error("Incorrect current password.");
                }
                throw signInError;
            }

            // 2. Update to New Password
            const { error } = await supabase.auth.updateUser({
                password: passwordData.newPassword
            });

            if (error) throw error;

            setToast({ message: 'Password updated successfully!', type: 'success' });
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setShowPasswordModal(false);
        } catch (error) {
            console.error('Error updating password:', error.message);
            setToast({ message: `Error: ${error.message}`, type: 'error' });
        } finally {
            setUpdatingPassword(false);
        }
    };

    if (loading) {
        return <MyAccountSkeleton />;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <div className="max-w-4xl mx-auto">
                {/* Header Section */}
                <div className="mb-8">
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 mb-2">
                        Account Settings
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage your profile information and security preferences.</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700/50">
                    <div className="md:flex">
                        {/* Sidebar / Avatar Section */}
                        <div className="md:w-1/3 bg-gray-50 dark:bg-gray-800/50 p-8 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-700/50 flex flex-col items-center justify-center text-center">
                            <div className="relative group cursor-pointer mb-6">
                                <div className="h-32 w-32 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-4xl font-bold shadow-lg ring-4 ring-white dark:ring-gray-800">
                                    {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : <User className="h-12 w-12" />}
                                </div>
                                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <Camera className="h-8 w-8 text-white" />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                                {profile.full_name || 'Student'}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1 mb-4">
                                <Shield className="h-4 w-4 text-green-500" /> Secure Account
                            </p>
                        </div>

                        {/* Form Section */}
                        <div className="md:w-2/3 p-8">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 gap-6">
                                    {/* Email */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                            Email Address
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Mail className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                type="email"
                                                value={user?.email || ''}
                                                disabled
                                                className="block w-full pl-11 pr-4 py-3 bg-gray-100 dark:bg-gray-900/50 border border-transparent rounded-xl text-gray-500 dark:text-gray-400 cursor-not-allowed sm:text-sm focus:ring-0"
                                            />
                                        </div>
                                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                            Email cannot be changed for security reasons.
                                        </p>
                                    </div>

                                    {/* Full Name */}
                                    <div>
                                        <label htmlFor="full_name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                            Full Name
                                        </label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <User className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                            </div>
                                            <input
                                                type="text"
                                                name="full_name"
                                                id="full_name"
                                                value={profile.full_name}
                                                onChange={handleChange}
                                                placeholder="John Doe"
                                                className="block w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                                            />
                                        </div>
                                    </div>

                                    {/* Mobile Number */}
                                    <div>
                                        <label htmlFor="mobile_number" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                            Mobile Number
                                        </label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Phone className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                            </div>
                                            <input
                                                type="tel"
                                                name="mobile_number"
                                                id="mobile_number"
                                                value={profile.mobile_number}
                                                onChange={handleChange}
                                                placeholder="+91 98765 43210"
                                                className="block w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row justify-between items-center pt-8 mt-8 border-t border-gray-100 dark:border-gray-700/50 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswordModal(true)}
                                        className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
                                    >
                                        <Lock className="h-4 w-4 mr-2 text-indigo-500" />
                                        Change Password
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="w-full sm:w-auto inline-flex justify-center items-center px-8 py-3 border border-transparent rounded-xl shadow-lg text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transform hover:-translate-y-0.5 transition-all duration-200"
                                    >
                                        {saving ? (
                                            <>
                                                <Loader className="animate-spin -ml-1 mr-2 h-5 w-5" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="-ml-1 mr-2 h-5 w-5" />
                                                Save Changes
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* Password Change Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm transition-opacity" aria-hidden="true" onClick={() => setShowPasswordModal(false)}></div>

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="relative inline-block align-bottom bg-white dark:bg-gray-800 rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full border border-gray-100 dark:border-gray-700">
                            <div className="bg-white dark:bg-gray-800 px-6 pt-6 pb-6 border-b border-gray-100 dark:border-gray-700/50">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2" id="modal-title">
                                        <Lock className="h-6 w-6 text-indigo-500" />
                                        Update Security
                                    </h3>
                                    <button
                                        onClick={() => setShowPasswordModal(false)}
                                        className="rounded-full p-1.5 text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none transition-colors"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <form onSubmit={handlePasswordUpdate}>
                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                                Current Password
                                            </label>
                                            <input
                                                type="password"
                                                value={passwordData.currentPassword}
                                                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                                required
                                                placeholder="••••••••"
                                                className="block w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                                New Password
                                            </label>
                                            <input
                                                type="password"
                                                value={passwordData.newPassword}
                                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                                required
                                                minLength={6}
                                                placeholder="Min 6 characters"
                                                className="block w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                                Confirm New Password
                                            </label>
                                            <input
                                                type="password"
                                                value={passwordData.confirmPassword}
                                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                                required
                                                minLength={6}
                                                placeholder="Re-enter password"
                                                className="block w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-8 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswordModal(false)}
                                            className="w-full sm:w-auto inline-flex justify-center rounded-xl border border-gray-300 dark:border-gray-600 px-6 py-2.5 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={updatingPassword}
                                            className="w-full sm:w-auto inline-flex justify-center rounded-xl border border-transparent shadow-md px-6 py-2.5 bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
                                        >
                                            {updatingPassword ? 'Updating...' : 'Update Password'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
