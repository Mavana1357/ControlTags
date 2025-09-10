import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { Loader2, FileText } from 'lucide-react';

const ComprobantesViewer = ({ invokeEdgeFunction }) => {
  const [files, setFiles] = useState({ altas: [], bajas: [] });
  const [isLoading, setIsLoading] = useState(false);

  const fetchUrls = useCallback(async (type) => {
    const lowerCaseType = type.toLowerCase();
    if (files[lowerCaseType].length > 0 && lowerCaseType !== 'altas' && lowerCaseType !== 'bajas') return;

    setIsLoading(true);
    try {
      let query;
      if (type === 'Altas') {
        query = "SELECT IDSAE, Etiqueta, DocAltaTag as url, FechaAlta FROM Tags WHERE DocAltaTag IS NOT NULL AND DocAltaTag != '' ORDER BY FechaAlta DESC";
      } else {
        query = `
          SELECT IDSAE, Etiqueta, Identificador, url, FechaActualizacion 
          FROM (
              SELECT 
                  IDSAE, 
                  Etiqueta,
                  Identificador, 
                  DocCancelacion as url, 
                  FechaActualizacion
              FROM Tags 
              WHERE DocCancelacion IS NOT NULL AND DocCancelacion != ''
              UNION ALL
              SELECT 
                  IDSAE, 
                  Etiqueta,
                  Identificador,
                  CancelacionWA as url, 
                  FechaActualizacion
              FROM Tags 
              WHERE CancelacionWA IS NOT NULL AND CancelacionWA != ''
          ) as SubQuery
          ORDER BY FechaActualizacion DESC, IDSAE ASC;
        `;
      }
      const data = await invokeEdgeFunction(query);
      setFiles(prev => ({ ...prev, [lowerCaseType]: data || [] }));
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error al obtener comprobantes",
        description: err.message,
      });
      setFiles(prev => ({ ...prev, [lowerCaseType]: [] }));
    } finally {
      setIsLoading(false);
    }
  }, [invokeEdgeFunction, files]);

  const renderFileList = (fileList) => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
        </div>
      );
    }

    if (fileList.length === 0) {
      return <p className="text-center text-slate-500 py-8">No se encontraron comprobantes.</p>;
    }

    return (
      <div className="max-h-[calc(80vh-200px)] overflow-y-auto pr-2">
        <ul className="space-y-2">
          {fileList.map((file, index) => (
            <li key={index} className="flex justify-between items-center p-2 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors">
              <div className="flex items-center gap-3 truncate">
                <FileText className="w-5 h-5 text-slate-600 flex-shrink-0" />
                <div className="truncate">
                  <p className="text-sm font-medium text-slate-800 truncate">{file.url.split('/').pop()}</p>
                  <p className="text-xs text-slate-500">IDSAE: {file.IDSAE}</p>
                </div>
              </div>
              <a href={file.url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">Ver</Button>
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <DialogContent className="sm:max-w-[625px] h-[80vh] flex flex-col">
      <DialogHeader>
        <DialogTitle>Visor de Comprobantes</DialogTitle>
        <DialogDescription>
          Consulta los comprobantes de alta y baja guardados en la base de datos.
        </DialogDescription>
      </DialogHeader>
      <Tabs defaultValue="altas" className="w-full flex-grow flex flex-col" onValueChange={(value) => fetchUrls(value.charAt(0).toUpperCase() + value.slice(1))}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="altas" onClick={() => fetchUrls('Altas')}>Altas</TabsTrigger>
          <TabsTrigger value="bajas" onClick={() => fetchUrls('Bajas')}>Bajas</TabsTrigger>
        </TabsList>
        <div className="flex-grow overflow-hidden mt-4">
          <TabsContent value="altas">
            {renderFileList(files.altas)}
          </TabsContent>
          <TabsContent value="bajas">
            {renderFileList(files.bajas)}
          </TabsContent>
        </div>
      </Tabs>
      <DialogFooter>
        <DialogTrigger asChild>
          <Button variant="secondary">Cerrar</Button>
        </DialogTrigger>
      </DialogFooter>
    </DialogContent>
  );
};

export default ComprobantesViewer;