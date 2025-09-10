import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import SearchForms from '@/components/SearchForms';
import SearchResults from '@/components/SearchResults';
import AssignForm from '@/components/AssignForm';
import DocView from '@/components/DocView';
import PaymentForm from '@/components/PaymentForm';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import Header from '@/components/Header';

const SearchInterface = () => {
  const { session } = useAuth();
  const [searchValues, setSearchValues] = useState({ idsae: '', nombre: '', tag: '' });
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState('search');
  const [docData, setDocData] = useState(null);
  const [docType, setDocType] = useState(null);
  const [suspendedMap, setSuspendedMap] = useState(new Map());
  const [searchTitle, setSearchTitle] = useState('TAG / APP');

  const invokeEdgeFunction = useCallback(async (query, params = []) => {
    if (!session) {
      throw new Error("No hay una sesión de usuario activa.");
    }
    
    const { data, error } = await supabase.functions.invoke('api-mysql', {
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      },
      body: { query, params },
    });
    
    if (error) throw new Error(`Error al invocar Edge Function: ${error.message}`);
    if (data && data.error) throw new Error(`Error en la base de datos: ${data.error}`);
    
    return data;
  }, [session]);
    
  const fetchSuspendedInfo = useCallback(async () => {
      try {
        const data = await invokeEdgeFunction("SELECT Tag, Comentario, FechaBitacora FROM BitacoraMalUso");
        const newMap = new Map();
        (data || []).forEach(item => newMap.set(item.Tag, {
            Comentario: item.Comentario,
            FechaSuspension: item.FechaBitacora
        }));
        setSuspendedMap(newMap);
      } catch (error) {
        console.error("Error fetching suspended tags:", error);
        setSuspendedMap(new Map());
      }
    }, [invokeEdgeFunction]);

  const validateVigencia = useCallback(async (searchResults) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const result of searchResults) {
      if (!result.Vigencia) continue;

      const parts = result.Vigencia.split('/');
      if (parts.length !== 3) continue;

      const vigenciaDate = new Date(parts[2], parts[1] - 1, parts[0]);
      vigenciaDate.setHours(0, 0, 0, 0);

      const expectedValidaVigencia = vigenciaDate >= today ? 0 : 1;

      if (result.ValidaVigencia !== expectedValidaVigencia) {
        try {
          const query = "UPDATE Asociado SET ValidaVigencia = ? WHERE IDSAE = ?";
          await invokeEdgeFunction(query, [expectedValidaVigencia, result.IDSAE]);
          result.ValidaVigencia = expectedValidaVigencia;
        } catch (error) {
          console.error(`Error updating vigencia for ${result.IDSAE}:`, error);
        }
      }
    }
    return searchResults;
  }, [invokeEdgeFunction]);


  useEffect(() => {
    const testDbConnection = async () => {
      try {
        await invokeEdgeFunction("SELECT 1");
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error de Conexión ❌",
          description: `No se pudo conectar a la base de datos: ${error.message}`,
        });
      }
    };
    if (session) {
        testDbConnection();
        fetchSuspendedInfo();
    }
  }, [invokeEdgeFunction, session, fetchSuspendedInfo]);
  
  const handleSearch = async (searchType, value) => {
    if (!value || value.trim() === '') {
      setResults([]);
      return;
    }
    setIsLoading(true);
    setResults([]);
    setView('search');
    setSearchTitle('TAG / APP');

    try {
      let finalQuery = `
        SELECT 
          a.IDSAE, a.Nombre, CAST(a.Vigencia AS CHAR(50)) as Vigencia, a.ValidaVigencia,
          d.Calle, d.NumInt, d.NumExt,
          t.Etiqueta, t.Identificador, t.Activa
        FROM Asociado a
        LEFT JOIN Direccion d ON a.IDSAE = d.IDSAE
        LEFT JOIN Tags t ON a.IDSAE = t.IDSAE
      `;
      let params = [];

      if (searchType === 'idsae') {
        finalQuery += ' WHERE a.IDSAE = ?';
        params = [value];
      } else if (searchType === 'nombre') {
        finalQuery += ' WHERE a.Nombre LIKE ?';
        params = [`%${value}%`];
      } else if (searchType === 'tag') {
        if (value.length >= 7) {
          finalQuery += ' WHERE t.Etiqueta = ? OR t.Identificador = ?';
          params = [value, value];
        } else {
          finalQuery += ' WHERE (SUBSTRING(t.Etiqueta, 1, ?) = ? OR SUBSTRING(t.Etiqueta, 7) = ?) OR (SUBSTRING(t.Identificador, 1, ?) = ? OR SUBSTRING(t.Identificador, 7) = ?)';
          params = [value.length, value, value, value.length, value, value];
        }
      } else {
        setIsLoading(false);
        return;
      }
      
      const data = await invokeEdgeFunction(finalQuery, params);
      const validatedData = await validateVigencia(data || []);
      const resultsWithSuspension = validatedData.map(result => {
        const tagOrId = result.Etiqueta === 'APP' ? result.Identificador : result.Etiqueta;
        const suspensionInfo = suspendedMap.get(tagOrId);
        return {
          ...result,
          isSuspended: !!suspensionInfo,
          Comentario: suspensionInfo ? suspensionInfo.Comentario : null,
          Vigencia: suspensionInfo ? suspensionInfo.FechaSuspension : result.Vigencia
        }
      });
      setResults(resultsWithSuspension);

    } catch (error) {
      toast({ variant: "destructive", title: "Error en la búsqueda", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuspendedSearch = async () => {
    setIsLoading(true);
    setResults([]);
    setView('search');
    setSearchValues({ idsae: '', nombre: '', tag: '' });

    try {
        const query = `
          SELECT DISTINCT
            b.IDSAE, 
            b.Tag as suspendedTag, 
            b.Comentario, 
            CAST(b.FechaBitacora AS CHAR(50)) as Vigencia, 
            t.Identificador,
            t.Etiqueta,
            0 as Activa 
          FROM BitacoraMalUso b
          LEFT JOIN Tags t ON b.Tag = t.Identificador OR b.Tag = t.Etiqueta
          ORDER BY b.IDBitacora DESC
        `;
        const data = await invokeEdgeFunction(query);
        const transformedData = data.map(item => ({...item, isSuspendedView: true, isSuspended: true}));
        setResults(transformedData || []);
        setSearchTitle('TAGS Suspendidos');
    } catch (error) {
        toast({ variant: "destructive", title: "Error al buscar suspendidos", description: error.message });
    } finally {
        setIsLoading(false);
    }
  };

  const handleBaja = async (result) => {
    try {
      let query;
      let params;

      if (result.Etiqueta === 'APP' && result.Identificador) {
        query = "UPDATE Tags SET Activa = 1 WHERE IDSAE = ? AND Identificador = ?";
        params = [result.IDSAE, result.Identificador];
      } else {
        query = "UPDATE Tags SET Activa = 1 WHERE IDSAE = ? AND Etiqueta = ?";
        params = [result.IDSAE, result.Etiqueta];
      }
      
      await invokeEdgeFunction(query, params);

      toast({ title: "Tag dado de baja", description: "El estado del tag ha sido actualizado." });
      setDocData(result);
      setDocType('baja');
      setView('doc-view');
      
    } catch (error) {
      toast({ variant: "destructive", title: "Error al dar de baja", description: error.message });
    }
  };

  const handleSuspend = async (result, comment) => {
    if (!comment.trim()) {
        toast({ variant: "destructive", title: "Comentario vacío", description: "Debes ingresar un motivo para la suspensión." });
        return;
    }
    
    const tagToSuspend = result.Etiqueta === 'APP' ? result.Identificador : result.Etiqueta;

    if (suspendedMap.has(tagToSuspend)) {
        toast({ variant: "destructive", title: "Ya suspendido", description: `Este acceso (${tagToSuspend}) ya se encuentra en la bitácora de mal uso.` });
        return;
    }

    try {
        const maxIdQuery = "SELECT MAX(IDBitacora) as maxId FROM BitacoraMalUso";
        const maxIdData = await invokeEdgeFunction(maxIdQuery);
        const nextId = (maxIdData && maxIdData[0] && maxIdData[0].maxId) ? maxIdData[0].maxId + 1 : 1;

        const date = new Date();
        const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;

        const insertQuery = "INSERT INTO BitacoraMalUso (IDBitacora, IDSAE, Tag, FechaBitacora, Comentario) VALUES (?, ?, ?, ?, ?)";
        await invokeEdgeFunction(insertQuery, [nextId, result.IDSAE, tagToSuspend, formattedDate, comment]);

        toast({ title: "Tag Suspendido", description: "El tag ha sido registrado en la bitácora de mal uso." });
        await fetchSuspendedInfo();
        const lastSearchType = Object.keys(searchValues).find(k => searchValues[k]);
        const lastSearchValue = Object.values(searchValues).find(v => v);
        if (lastSearchType && lastSearchValue) {
            handleSearch(lastSearchType, lastSearchValue);
        }

    } catch (error) {
        toast({ variant: "destructive", title: "Error al suspender", description: error.message });
    }
  };

  const handleAssignSubmit = async (data) => {
    try {
      if (data.Tipo === 'TAG') {
        const query = "UPDATE Tags SET IDSAE = ?, TAGNUEVA = 0, FechaAlta = ? WHERE Etiqueta = ?";
        const formattedDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
        await invokeEdgeFunction(query, [data.IDSAE, formattedDate, data.Etiqueta]);
      } else { // APP
        const query = "INSERT INTO Tags (IDSAE, Etiqueta, Identificador, TAGNUEVA, Activa, FechaAlta) VALUES (?, ?, ?, 2, 0, ?)";
        const formattedDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
        await invokeEdgeFunction(query, [data.IDSAE, 'APP', data.Identificador, formattedDate]);
      }

      toast({ title: "Asignación completada", description: "El registro ha sido guardado en la base de datos." });
      setDocData(data);
      setDocType('alta');
      setView('doc-view');
    } catch (error) {
      toast({ variant: "destructive", title: "Error en la asignación", description: error.message });
    }
  };
  
  const handlePaymentSubmit = async (nombre, nuevaVigencia) => {
    try {
      const query = "UPDATE Asociado SET Vigencia = ?, ValidaVigencia = 0 WHERE Nombre = ?";
      await invokeEdgeFunction(query, [nuevaVigencia, nombre]);
      toast({
        title: "Pago Registrado",
        description: `La vigencia para ${nombre} ha sido actualizada a ${nuevaVigencia}.`
      });
      setView('search');
    } catch (error) {
      toast({ variant: "destructive", title: "Error al registrar el pago", description: error.message });
    }
  };


  const handlePdfGenerated = () => {
    toast({
      title: "PDF Generado",
      description: "El comprobante se ha generado exitosamente."
    });
    const lastSearchType = Object.keys(searchValues).find(k => searchValues[k]);
    const lastSearchValue = Object.values(searchValues).find(v => v);
    if (lastSearchType && lastSearchValue) {
      handleSearch(lastSearchType, lastSearchValue);
    } else if (searchTitle === 'TAGS Suspendidos') {
      handleSuspendedSearch();
    }
    setView('search');
  };

  const renderContent = () => {
    switch (view) {
      case 'assign':
        return (
          <>
            <Button onClick={() => setView('search')} variant="outline" className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <AssignForm onSubmit={handleAssignSubmit} />
          </>
        );
      case 'payment':
        return (
            <>
                <Button onClick={() => setView('search')} variant="outline" className="mb-6">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver
                </Button>
                <PaymentForm onSubmit={handlePaymentSubmit} invokeEdgeFunction={invokeEdgeFunction} />
            </>
        );
      case 'doc-view':
        return <DocView type={docType} data={docData} onBack={() => setView('search')} onPdfGenerated={handlePdfGenerated} />;
      case 'search':
      default:
        return (
          <>
            <Header 
              onSetView={setView} 
              onSuspendedSearch={handleSuspendedSearch}
              invokeEdgeFunction={invokeEdgeFunction}
            />
            <SearchForms onSearch={handleSearch} searchValues={searchValues} setSearchValues={setSearchValues} isLoading={isLoading} />
            <SearchResults 
              results={results} 
              onBaja={handleBaja}
              onSuspend={handleSuspend}
              title={searchTitle}
            />
          </>
        );
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-slate-50">
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default SearchInterface;