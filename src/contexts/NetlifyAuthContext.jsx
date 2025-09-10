import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import netlifyIdentity from 'netlify-identity-widget';

const AuthContext = createContext(undefined);

export const NetlifyAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    netlifyIdentity.init();

    const currentUser = netlifyIdentity.currentUser();
    if (currentUser) {
      setUser(currentUser);
    }
    setLoading(false);

    const handleLogin = (user) => {
      setUser(user);
      netlifyIdentity.close();
    };

    const handleLogout = () => {
      setUser(null);
    };

    netlifyIdentity.on('login', handleLogin);
    netlifyIdentity.on('logout', handleLogout);

    return () => {
      netlifyIdentity.off('login', handleLogin);
      netlifyIdentity.off('logout', handleLogout);
    };
  }, []);

  const login = (email, password) => {
    return netlifyIdentity.login(email, password, true);
  };

  const logout = () => {
    netlifyIdentity.logout();
  };

  const value = useMemo(() => ({
    user,
    loading,
    login,
    logout,
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a NetlifyAuthProvider');
  }
  return context;
};