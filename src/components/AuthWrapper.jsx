import React from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import LoginForm from '@/components/LoginForm';
import SearchInterface from '@/components/SearchInterface';
import { motion } from 'framer-motion';

const AuthWrapper = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-4 border-[#84b6f4] border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return user ? <SearchInterface /> : <LoginForm />;
};

export default AuthWrapper;