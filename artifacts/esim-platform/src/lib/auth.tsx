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
  login: (email: string, role?: UserProfileRole) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  login: () => {},
  logout: () => {},
  isLoading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('mock_auth_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser) as User;
      setUser(parsed);
      setAuthTokenGetter(() => parsed.uid);
    } else {
      setAuthTokenGetter(null);
    }
    setIsLoading(false);
  }, []);

  const login = (email: string, role: UserProfileRole = "user") => {
    const isAdmin = email.toLowerCase().includes("admin");
    const uid = isAdmin ? "admin-demo" : "user-demo";
    const detectedRole: UserProfileRole = isAdmin ? "admin" : "user";
    const newUser: User = {
      uid,
      email,
      displayName: email.split('@')[0],
      role: detectedRole,
    };
    setUser(newUser);
    localStorage.setItem('mock_auth_user', JSON.stringify(newUser));
    setAuthTokenGetter(() => uid);

    fetch('/api/user/upsert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${uid}`,
      },
      body: JSON.stringify({ email, displayName: newUser.displayName }),
    }).catch(() => {});
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('mock_auth_user');
    setAuthTokenGetter(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
