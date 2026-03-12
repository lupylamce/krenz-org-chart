import { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (email, password) => {
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (e) {
      setLoginError('登入失敗。');
      return false;
    }
  };

  const handleGoogleLogin = async () => {
    setLoginError('');
    try {
      await signInWithPopup(auth, googleProvider);
      return true;
    } catch (e) {
      if (!e.message?.includes('closed')) setLoginError('Google登入失敗。');
      return false;
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      return true;
    } catch (e) {
      return false;
    }
  };

  return {
    user,
    isAuthChecking,
    loginError,
    handleLogin,
    handleGoogleLogin,
    handleLogout
  };
}
