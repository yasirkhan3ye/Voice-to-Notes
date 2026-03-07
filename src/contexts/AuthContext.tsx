import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  db,
  doc,
  setDoc,
  getDoc,
  ConfirmationResult
} from '../firebase';
import { serverTimestamp } from 'firebase/firestore';
import { signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Capacitor } from '@capacitor/core';

interface User {
  id: string;
  email: string;
  name: string;
  phoneNumber?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithPhone: (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier) => Promise<ConfirmationResult>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Check if user exists in Firestore, if not create
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (!userDoc.exists()) {
            const newUser = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || 'User',
              phoneNumber: firebaseUser.phoneNumber || '',
              createdAt: serverTimestamp()
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            setUser({
              id: newUser.id,
              email: newUser.email,
              name: newUser.name,
              phoneNumber: newUser.phoneNumber
            });
          } else {
            const userData = userDoc.data() as any;
            setUser({
              id: userData.id,
              email: userData.email,
              name: userData.name,
              phoneNumber: userData.phoneNumber
            });
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Auth state change error:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const refreshUser = async () => {
    // Firebase handles this automatically via onAuthStateChanged
  };

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (email: string, password: string, name: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // The onAuthStateChanged will handle the Firestore creation, 
    // but we can also set the display name here if we want
    // await updateProfile(userCredential.user, { displayName: name });
    // For now, the Firestore creation in useEffect will use 'User' if displayName is null
    // We can update the Firestore doc immediately if we want to ensure the name is set
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      id: userCredential.user.uid,
      email: email,
      name: name,
      createdAt: serverTimestamp()
    });
  };

  const logout = async () => {
    if (Capacitor.isNativePlatform()) {
      await FirebaseAuthentication.signOut();
    }
    await signOut(auth);
  };

  const loginWithGoogle = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const result = await FirebaseAuthentication.signInWithGoogle();
        if (result.credential?.idToken) {
          const credential = GoogleAuthProvider.credential(result.credential.idToken);
          await signInWithCredential(auth, credential);
        } else {
          throw new Error('Google Login failed: No idToken received from native layer.');
        }
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (error: any) {
      console.error("Google Login Error:", error);
      if (error.message.includes('deleted_client')) {
        throw new Error('The Google OAuth client is misconfigured. Please contact support.');
      }
      throw error;
    }
  };

  const loginWithPhone = async (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier) => {
    return await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, loginWithGoogle, loginWithPhone, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
