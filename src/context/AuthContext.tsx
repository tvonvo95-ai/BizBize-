import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth';
import { auth } from '../firebase/config';
import {
  createOrUpdateUserProfile,
  getUserProfile,
  subscribeToUserProfile,
  setUserOnlineStatus,
  deleteUserAccount,
} from '../firebase/services';
import { UserProfile } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  setupPhoneAuth: (elementId: string) => RecaptchaVerifier;
  sendPhoneCode: (phoneNumber: string, verifier: RecaptchaVerifier) => Promise<ConfirmationResult>;
  verifyPhoneCode: (confirmationResult: ConfirmationResult, code: string) => Promise<void>;
  loginAsDemoUser: (demoUser: DemoProfile) => Promise<void>;
  updateProfileData: (updates: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  exitDemoMode: () => void;
  isDemoUser: boolean;
}

export interface DemoProfile {
  uid: string;
  displayName: string;
  username: string;
  phoneNumber: string;
  photoURL: string;
  bio: string;
}

export const DEMO_USERS: DemoProfile[] = [
  {
    uid: 'demo_ayse_01',
    displayName: 'Ayşe Yılmaz',
    username: 'ayse.yilmaz',
    phoneNumber: '+90 532 100 2030',
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    bio: 'BizBize ❤️ ile sevdiklerimle iletişimdeyim!',
  },
  {
    uid: 'demo_mehmet_02',
    displayName: 'Mehmet Demir',
    username: 'mehmet_demir',
    phoneNumber: '+90 542 200 3040',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    bio: 'Kod yazıyorum, kahve içiyorum ☕💻',
  },
  {
    uid: 'demo_zeynep_03',
    displayName: 'Zeynep Kaya',
    username: 'zeynep.kaya',
    phoneNumber: '+90 555 300 4050',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    bio: 'Müzik ve fotoğraf tutkunu 🎵📷',
  },
  {
    uid: 'demo_burak_04',
    displayName: 'Burak Çelik',
    username: 'burak_celik',
    phoneNumber: '+90 505 400 5060',
    photoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    bio: 'Yoldayım... 🚗',
  },
];

export const buildUserProfileFromFirebaseUser = (user: FirebaseUser): UserProfile => {
  const cleanEmailName = user.email ? user.email.split('@')[0] : '';
  const cleanUsername = cleanEmailName
    ? cleanEmailName.toLowerCase().replace(/[^a-z0-9_.]/g, '')
    : `user_${user.uid.slice(0, 6)}`;

  return {
    uid: user.uid,
    displayName: user.displayName || cleanEmailName || 'BizBize Kullanıcısı',
    username: cleanUsername,
    phoneNumber: user.phoneNumber || '',
    photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
    bio: 'Merhaba! BizBize ❤️ kullanıyorum.',
    isOnline: true,
    lastSeen: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    privacySettings: {
      lastSeen: 'everyone',
      photoURL: 'everyone',
      readReceipts: true,
      phoneAudience: 'everyone',
    },
    blockedUsers: [],
  };
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoUser, setIsDemoUser] = useState(false);

  // Check saved demo user or listen to real Firebase Auth
  useEffect(() => {
    // 1. Initial temporary check for demo session while Firebase Auth initializes
    const savedDemo = localStorage.getItem('bizbize_demo_session');
    if (savedDemo) {
      try {
        const parsed = JSON.parse(savedDemo) as UserProfile;
        setProfile(parsed);
        setIsDemoUser(true);
      } catch (e) {
        localStorage.removeItem('bizbize_demo_session');
      }
    }

    // 2. ALWAYS register Firebase Auth listener
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Real user authenticated! Erase demo session immediately
        localStorage.removeItem('bizbize_demo_session');
        setIsDemoUser(false);
        setCurrentUser(user);

        // Immediately supply full profile from auth credentials to eliminate any screen flicker
        const instantProfile = buildUserProfileFromFirebaseUser(user);
        setProfile((prev) => (prev && prev.uid === user.uid ? prev : instantProfile));
        setLoading(false);

        // In background: fetch or create remote doc
        try {
          const remoteProf = await getUserProfile(user.uid);
          if (remoteProf) {
            setProfile(remoteProf);
          } else {
            await createOrUpdateUserProfile(instantProfile);
          }
          await setUserOnlineStatus(user.uid, true);
        } catch (err) {
          console.warn('Profile sync in onAuthStateChanged:', err);
        }
      } else {
        setCurrentUser(null);
        const activeDemo = localStorage.getItem('bizbize_demo_session');
        if (activeDemo) {
          try {
            const parsed = JSON.parse(activeDemo) as UserProfile;
            setProfile(parsed);
            setIsDemoUser(true);
          } catch (e) {
            localStorage.removeItem('bizbize_demo_session');
            setProfile(null);
            setIsDemoUser(false);
          }
        } else {
          setProfile(null);
          setIsDemoUser(false);
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync profile changes in realtime
  useEffect(() => {
    if (!profile?.uid || isDemoUser) return;
    const unsub = subscribeToUserProfile(profile.uid, (updated) => {
      if (updated) setProfile(updated);
    });

    const handleVisibility = () => {
      const isOnline = document.visibilityState === 'visible';
      setUserOnlineStatus(profile.uid, isOnline);
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', () => {
      setUserOnlineStatus(profile.uid, false);
    });

    return () => {
      unsub();
      window.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [profile?.uid, isDemoUser]);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);
      
      // Wipe demo state immediately
      localStorage.removeItem('bizbize_demo_session');
      setIsDemoUser(false);
      setCurrentUser(cred.user);

      // INSTANTLY construct and set profile - NO DELAY, TRANSITIONS DIRECTLY TO CHATS SCREEN
      const instantProfile = buildUserProfileFromFirebaseUser(cred.user);
      setProfile(instantProfile);

      // Persist in Firestore in background
      try {
        const existing = await getUserProfile(cred.user.uid);
        if (existing) {
          setProfile(existing);
        } else {
          await createOrUpdateUserProfile(instantProfile);
        }
        await setUserOnlineStatus(cred.user.uid, true);
      } catch (err) {
        console.warn('Background profile sync on Google sign in:', err);
      }
    } catch (error) {
      console.error('Google Sign-in failed:', error);
      throw error;
    }
  };

  const exitDemoMode = () => {
    localStorage.removeItem('bizbize_demo_session');
    setIsDemoUser(false);
    setProfile(null);
  };

  const setupPhoneAuth = (elementId: string) => {
    return new RecaptchaVerifier(auth, elementId, {
      size: 'invisible',
      callback: () => {},
    });
  };

  const sendPhoneCode = async (phoneNumber: string, verifier: RecaptchaVerifier) => {
    return await signInWithPhoneNumber(auth, phoneNumber, verifier);
  };

  const verifyPhoneCode = async (confirmationResult: ConfirmationResult, code: string) => {
    const cred = await confirmationResult.confirm(code);
    if (cred.user) {
      localStorage.removeItem('bizbize_demo_session');
      setIsDemoUser(false);
    }
  };

  const loginAsDemoUser = async (demo: DemoProfile) => {
    const demoProf: UserProfile = {
      uid: demo.uid,
      displayName: demo.displayName,
      username: demo.username,
      phoneNumber: demo.phoneNumber,
      photoURL: demo.photoURL,
      bio: demo.bio,
      isOnline: true,
      lastSeen: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      privacySettings: {
        lastSeen: 'everyone',
        photoURL: 'everyone',
        readReceipts: true,
      },
      blockedUsers: [],
    };
    setProfile(demoProf);
    setIsDemoUser(true);
    setCurrentUser(null);
    localStorage.setItem('bizbize_demo_session', JSON.stringify(demoProf));
  };

  const updateProfileData = async (updates: Partial<UserProfile>) => {
    if (!profile) return;
    if (isDemoUser) {
      const updated: UserProfile = { ...profile, ...updates };
      setProfile(updated);
      localStorage.setItem('bizbize_demo_session', JSON.stringify(updated));
      return;
    }
    const updated = await createOrUpdateUserProfile({
      ...profile,
      ...updates,
      uid: profile.uid,
    });
    if (updated) {
      setProfile(updated);
    }
  };

  const logout = async () => {
    if (currentUser && profile?.uid) {
      await setUserOnlineStatus(profile.uid, false);
      await firebaseSignOut(auth);
    }
    localStorage.removeItem('bizbize_demo_session');
    setCurrentUser(null);
    setProfile(null);
    setIsDemoUser(false);
  };

  const deleteAccount = async () => {
    if (isDemoUser) {
      localStorage.removeItem('bizbize_demo_session');
      setProfile(null);
      setIsDemoUser(false);
      return;
    }
    if (currentUser && profile?.uid) {
      await deleteUserAccount(profile.uid);
      localStorage.removeItem('bizbize_demo_session');
      setCurrentUser(null);
      setProfile(null);
      setIsDemoUser(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile,
        loading,
        signInWithGoogle,
        setupPhoneAuth,
        sendPhoneCode,
        verifyPhoneCode,
        loginAsDemoUser,
        updateProfileData,
        logout,
        deleteAccount,
        exitDemoMode,
        isDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
