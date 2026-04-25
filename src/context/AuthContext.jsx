/**
 * AuthContext — Provides auth state, login, register, logout to the entire app.
 * Handles the loading state to prevent UI flash.
 */
import { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  onAuthChange,
  loginUser,
  registerUser,
  logoutUser,
  isRegistrationLocked,
} from '../firebase/auth';
import { initializeNewUser } from '../firebase/firestore';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registrationLocked, setRegistrationLocked] = useState(false);

  // Listen for auth state changes on mount
  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Check registration lock status on mount
  useEffect(() => {
    isRegistrationLocked().then(setRegistrationLocked);
  }, []);

  const login = useCallback(async (email, password) => {
    return await loginUser(email, password);
  }, []);

  const register = useCallback(async (email, password) => {
    const newUser = await registerUser(email, password);
    await initializeNewUser(newUser.uid);
    setRegistrationLocked(true);
    return newUser;
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      registrationLocked,
    }),
    [user, loading, login, register, logout, registrationLocked]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
