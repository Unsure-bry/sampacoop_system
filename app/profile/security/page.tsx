'use client';

import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/shared/Card';
import { updatePassword } from '@/lib/passwordUtils';
import { toast } from 'react-hot-toast';
import { firestore } from '@/lib/firebase';
import { Eye, EyeOff, LogOut, AlertTriangle, ArrowLeft } from 'lucide-react';
import { collection, query, where, getDocs, deleteDoc, doc, getFirestore } from 'firebase/firestore';
import { app } from '@/lib/firebase';

interface Session {
  id: string;
  device: string;
  browser: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

export default function SecuritySettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  // Sessions State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      fetchSessions();
    }
  }, [user]);

  const fetchSessions = async () => {
    try {
      setSessionsLoading(true);

      // Get Firestore instance
      if (!app || !user?.uid) {
        throw new Error('App or user not available');
      }
      const db = getFirestore(app);
      if (!db) {
        // Fallback to default session if no db or user
        setSessions([{
          id: 'current',
          device: 'This Device',
          browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Web Browser',
          location: 'Current Location',
          lastActive: new Date().toISOString(),
          isCurrent: true,
        }]);
        return;
      }

      // Get sessions from Firestore subcollection using native SDK
      const sessionsRef = collection(db, 'users', user.uid, 'sessions');
      const sessionsSnap = await getDocs(sessionsRef);

      if (!sessionsSnap.empty) {
        const sessionsData: Session[] = [];
        sessionsSnap.forEach((doc) => {
          const data = doc.data();
          sessionsData.push({
            id: doc.id,
            device: data.device || 'Unknown Device',
            browser: data.browser || 'Unknown Browser',
            location: data.location || 'Unknown Location',
            lastActive: data.lastActive?.toDate ? data.lastActive.toDate().toISOString() : data.lastActive || new Date().toISOString(),
            isCurrent: data.isCurrent || false,
          });
        });
        setSessions(sessionsData);
      } else {
        // If no sessions collection, create a default current session
        setSessions([{
          id: 'current',
          device: 'This Device',
          browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Web Browser',
          location: 'Current Location',
          lastActive: new Date().toISOString(),
          isCurrent: true,
        }]);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      // Fallback to default session on error
      setSessions([{
        id: 'current',
        device: 'This Device',
        browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Web Browser',
        location: 'Current Location',
        lastActive: new Date().toISOString(),
        isCurrent: true,
      }]);
    } finally {
      setSessionsLoading(false);
    }
  };

  // Password Validation
  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return 'Password must contain at least one special character';
    }
    return null;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user types
    if (passwordErrors[name]) {
      setPasswordErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    // Validate current password
    if (!passwordForm.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }

    // Validate new password
    const passwordError = validatePassword(passwordForm.newPassword);
    if (passwordError) {
      errors.newPassword = passwordError;
    }

    // Validate confirm password
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      errors.confirmNewPassword = 'Passwords do not match';
    }

    // Check if new password is same as current
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      errors.newPassword = 'New password must be different from current password';
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setPasswordLoading(true);

    try {
      if (!user?.uid) {
        throw new Error('User not authenticated');
      }

      const result = await updatePassword(
        user.uid,
        passwordForm.currentPassword,
        passwordForm.newPassword
      );

      if (result.success) {
        toast.success('Password updated successfully!');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmNewPassword: '',
        });
        setPasswordErrors({});
      } else {
        throw new Error(result.error || 'Failed to update password');
      }
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Session Functions
  const handleRevokeSession = async (sessionId: string) => {
    try {
      if (!app || !user?.uid) {
        throw new Error('App or user not available');
      }

      // Get Firestore instance
      const db = getFirestore(app);

      // Delete session from Firestore subcollection
      const sessionRef = doc(db, 'users', user.uid, 'sessions', sessionId);
      await deleteDoc(sessionRef);

      toast.success('Session revoked successfully');
      // Refresh sessions list
      fetchSessions();
    } catch (error) {
      console.error('Error revoking session:', error);
      toast.error('Failed to revoke session');
    }
  };

  const handleRevokeAllSessions = async () => {
    try {
      setSessionsLoading(true);
      if (!app || !user?.uid) {
        throw new Error('App or user not available');
      }

      // Get Firestore instance
      const db = getFirestore(app);

      // Delete all sessions except current
      const otherSessions = sessions.filter(s => !s.isCurrent);

      for (const session of otherSessions) {
        const sessionRef = doc(db, 'users', user.uid, 'sessions', session.id);
        await deleteDoc(sessionRef);
      }

      toast.success('All other sessions revoked');
      fetchSessions();
    } catch (error) {
      console.error('Error revoking sessions:', error);
      toast.error('Failed to revoke sessions');
    } finally {
      setSessionsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-0">
      {/* Back Button */}
      <button
        onClick={() => router.push('/profile')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
      >
        <ArrowLeft className="h-5 w-5" />
        <span className="text-sm sm:text-base">Back to My Profile</span>
      </button>

      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-black">Security Settings</h1>

      {/* Change Password Card */}
      <Card title="Change Password">
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Current Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword.current ? 'text' : 'password'}
                name="currentPassword"
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black pr-10 ${
                  passwordErrors.currentPassword ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
              >
                {showPassword.current ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {passwordErrors.currentPassword && (
              <p className="mt-1 text-sm text-red-600">{passwordErrors.currentPassword}</p>
            )}
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword.new ? 'text' : 'password'}
                name="newPassword"
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black pr-10 ${
                  passwordErrors.newPassword ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('new')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
              >
                {showPassword.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {passwordErrors.newPassword && (
              <p className="mt-1 text-sm text-red-600">{passwordErrors.newPassword}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Must be at least 8 characters with uppercase, lowercase, number, and special character
            </p>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Confirm New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword.confirm ? 'text' : 'password'}
                name="confirmNewPassword"
                value={passwordForm.confirmNewPassword}
                onChange={handlePasswordChange}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black pr-10 ${
                  passwordErrors.confirmNewPassword ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
              >
                {showPassword.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {passwordErrors.confirmNewPassword && (
              <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmNewPassword}</p>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={passwordLoading}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
            >
              {passwordLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </>
              ) : 'Change Password'}
            </button>
          </div>
        </form>
      </Card>

      {/* Active Sessions Card */}
      <Card title="Active Sessions" className="mt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Manage your active sessions across all devices
            </p>
            {sessions.filter(s => !s.isCurrent).length > 0 && (
              <button
                onClick={handleRevokeAllSessions}
                disabled={sessionsLoading}
                className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
              >
                <LogOut className="h-4 w-4" />
                Revoke All Others
              </button>
            )}
          </div>

          {sessionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-red-600"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg gap-3 ${
                    session.isCurrent ? 'border-red-200 bg-red-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg shrink-0 ${session.isCurrent ? 'bg-red-100' : 'bg-gray-100'}`}>
                      <LogOut className={`h-4 w-4 ${session.isCurrent ? 'text-red-600' : 'text-gray-500'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-black text-sm sm:text-base">{session.device}</h3>
                        {session.isCurrent && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{session.browser}</p>
                      <p className="text-xs text-gray-500">
                        Last active: {new Date(session.lastActive).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {!session.isCurrent && (
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      className="w-full sm:w-auto text-red-600 hover:text-red-800 text-sm font-medium flex items-center justify-center gap-1 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Revoke
                    </button>
                  )}
                </div>
              ))}

              {sessions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No active sessions found
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
