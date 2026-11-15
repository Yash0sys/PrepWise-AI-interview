import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Check localStorage on initial load
    try {
      const stored = localStorage.getItem('prepwise_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Helper to log user in with persistent session
  const loginUser = (userData) => {
    const formattedUser = {
      id: userData.id || userData.uid || 'user_' + Date.now(),
      email: userData.email,
      name: userData.name || userData.displayName || userData.email.split('@')[0],
      ...userData,
    };
    setUser(formattedUser);
    try {
      localStorage.setItem('prepwise_user', JSON.stringify(formattedUser));
    } catch (e) {
      console.error('Failed to save user session to localStorage:', e);
    }
  };

  // Helper to log out
  const logout = async () => {
    setUser(null);
    try {
      localStorage.removeItem('prepwise_user');
      if (auth) {
        await firebaseSignOut(auth);
      }
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  useEffect(() => {
    // If user was already restored from localStorage, stop loading
    try {
      const stored = localStorage.getItem('prepwise_user');
      if (stored) {
        setUser(JSON.parse(stored));
        setLoading(false);
      }
    } catch {
      // ignore
    }

    if (!auth) {
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = onAuthStateChanged(
        auth,
        async (firebaseUser) => {
          if (firebaseUser) {
            try {
              let profileData = {};
              if (db) {
                const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                if (userDoc.exists()) {
                  profileData = userDoc.data();
                }
              }

              const fullUser = {
                id: firebaseUser.uid,
                email: firebaseUser.email,
                name: firebaseUser.displayName || profileData.name || firebaseUser.email.split('@')[0],
                ...profileData,
              };

              loginUser(fullUser);
            } catch (error) {
              console.error('Error fetching user profile:', error);
              loginUser({
                id: firebaseUser.uid,
                email: firebaseUser.email,
                name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
              });
            }
          }
          setLoading(false);
        },
        (error) => {
          console.error('Firebase Auth state error:', error);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Auth subscription error:', err);
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setUser, loginUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
