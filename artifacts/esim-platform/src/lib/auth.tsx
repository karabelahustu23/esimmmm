import React, { createContext, useContext, useState, useEffect } from 'react';
import { setAuthTokenGetter } from '@workspace/api-client-react';

type UserProfileRole = "user" | "admin";

interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserProfileRole;
}

interface AuthState {
  user: User | null;
  login: (email: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  loginError: string | null;
}

const AuthContext = createContext<AuthState>({
  user: null,
  login: async () => {},
  logout: () => {},
  isLoading: true,
  loginError: null,
});

function emailToUid(email: string): string {
  return email.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

async function upsertUser(uid: string, email: string, displayName: string): Promise<{ role: UserProfileRole }> {
  const res = await fetch('/api/user/upsert', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${uid}`,
    },
    body: JSON.stringify({ uid, email, displayName }),
  });

  if (!res.ok) {
    throw new Error('Failed to authenticate');
  }

  const data = await res.json();
  return { role: data.role as UserProfileRole };
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('auth_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser) as User;
      setUser(parsed);
      setAuthTokenGetter(() => parsed.uid);
    } else {
      setAuthTokenGetter(null);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string) => {
    setLoginError(null);
    const uid = emailToUid(email);
    const displayName = email.split('@')[0];

    try {
      const { role } = await upsertUser(uid, email, displayName);

      const newUser: User = { uid, email, displayName, role };
      setUser(newUser);
      localStorage.setItem('auth_user', JSON.stringify(newUser));
      setAuthTokenGetter(() => uid);
    } catch {
      setLoginError('Giriş yapılamadı. Lütfen tekrar deneyin.');
      throw new Error('Login failed');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
    setAuthTokenGetter(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, loginError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
