
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tag, ShieldOff, Loader2, Search, LogOut } from 'lucide-react';
import ControlResult from '@/components/ControlResult';
import LoginForm from '@/components/LoginForm';

const Control = () => {
  const { session, signOut } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

  const invokeEdgeFunction = useCallback(async (query, params = []) => {
    const { data, error } = await supabase.functions.invoke('control-tags-query', {
      body: { query, params },
    });
    if (error) throw new Error(error.message);
    if (data && data.error) throw new Error(data.error);
    return data;
  }, []);
  
  const handleSearch = async (term) => {
    if (!term || term.trim() === '') {
      setResults([]);
      setSearchPerformed(false);
      return;
    }
    
    setIsLoading(true);
    setSearchPerformed(true);

    try {
      let query;
      let params;

      if (term.length >= 7) {
        query = `
          SELECT t.Etiqueta, t.Identificador, CAST(a.Vigencia AS CHAR(50)) as Vigencia, a.ValidaVigencia, t.Activa 
          FROM Tags t JOIN Asociado a ON t.IDSAE = a.IDSAE 
          WHERE t.Etiqueta = ? OR t.Identificador = ?
        `;
        params = [term, term];
      } else if (term.length >= 4) {
        query = `
          SELECT t.Etiqueta, t.Identificador, CAST(a.Vigencia AS CHAR(50)) as Vigencia, a.ValidaVigencia, t.Activa 
          FROM Tags t JOIN Asociado a ON t.IDSAE = a.IDSAE 
          WHERE SUBSTRING(t.Etiqueta, 1, 4) = ? OR SUBSTRING(t.Identificador, 1, 4) = ?
        `;
        params = [term, term];
      } else {
        setResults([]);
        setIsLoading(false);
        return;
      }
      
      const data = await invokeEdgeFunction(query, params);
      setResults(data || []);

    } catch (error) {
      toast({ variant: "destructive", title: "Error en la búsqueda", description: error.message });
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuspendedSearch = async () => {
    setIsLoading(true);
    setSearchPerformed(true);
    setSearchTerm('');
    try {
      const query = `
        SELECT 
            b.Tag as suspendedTag, 
            b.Comentario, 
            CAST(b.FechaBitacora AS CHAR(50)) as FechaSuspension,
            t.Identificador,
            t.Etiqueta,
            t.Activa
        FROM BitacoraMalUso b
        LEFT JOIN Tags t ON b.Tag = t.Etiqueta OR b.Tag = t.Identificador
        ORDER BY b.IDBitacora DESC
      `;
      const data = await invokeEdgeFunction(query, []);
      setResults(data);
    } catch (error) {
      toast({ variant: "destructive", title: "Error al buscar suspendidos", description: error.message });
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch(searchTerm);
    }
  };

  if (!session) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl mx-auto"
      >
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <img src="https://storage.googleapis.com/hostinger-horizons-assets-prod/f80cb88e-90d5-4a1b-b1dd-40404cb3c7a5/4f0066d0557165926ac727a8ad71f9be.png" alt="Logo" className="h-10 sm:h-12"/>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Control de Tags</h1>
          </div>
          <Button variant="ghost" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </header>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input 
            placeholder="Buscar por TAG o APP..."
            className="pl-10 text-lg h-12"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
          />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            <Button onClick={() => handleSearch(searchTerm)} className="h-12 text-base bg-[#84b6f4] hover:bg-[#6da3e6] text-white" disabled={isLoading}>
                {isLoading && !searchPerformed ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Tag className="w-5 h-5 mr-2" />}
                Consultar TAG / APP
            </Button>
            <Button onClick={handleSuspendedSearch} className="h-12 text-base bg-orange-500 hover:bg-orange-600 text-white" disabled={isLoading}>
                {isLoading && searchPerformed ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <ShieldOff className="w-5 h-5 mr-2" />}
                Ver Suspendidos
            </Button>
        </div>
        
        <AnimatePresence>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
          ) : searchPerformed && results.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-10 px-4 bg-white rounded-lg shadow"
            >
              <p className="text-slate-600 font-medium">No se encontraron resultados para su búsqueda.</p>
              <p className="text-sm text-slate-400 mt-1">Intente con otro TAG o identificador.</p>
            </motion.div>
          ) : (
            <motion.div layout className="space-y-4">
              {results.map((result, index) => (
                <ControlResult key={`${result.Etiqueta || result.suspendedTag}-${index}`} result={result} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
};

export default Control;
