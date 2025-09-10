
import React from 'react';
import { Helmet } from 'react-helmet';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import { Toaster } from '@/components/ui/toaster';
import AuthWrapper from '@/components/AuthWrapper';
import Control from '@/components/Control';
import { Dialog } from '@/components/ui/dialog';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Helmet>
          <title>Control de Tags Comunidad Decidida</title>
          <meta name="description" content="Aplicación para la consulta y gestión de tags de acceso vehicular para Comunidad Decidida." />
          <meta name="theme-color" content="#1e40af" />
          <link rel="manifest" href="/manifest.json" />
        </Helmet>
        
        <div className="min-h-screen bg-slate-100">
          <Dialog>
            <Routes>
              <Route path="/control" element={<Control />} />
              <Route path="/admin" element={<AuthWrapper />} />
              <Route path="*" element={<Navigate to="/control" replace />} />
            </Routes>
          </Dialog>
          <Toaster />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
