
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tag as TagIcon, Smartphone, Save, Camera, CheckCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import Webcam from "react-webcam";

const PhotoCapture = ({ title, onCapture, image }) => {
  const webcamRef = useRef(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [videoDevices, setVideoDevices] = useState([]);
  const [currentDeviceId, setCurrentDeviceId] = useState(null);

  const handleDevices = useCallback(
    (mediaDevices) => {
      const videoDevs = mediaDevices.filter(({ kind }) => kind === "videoinput");
      setVideoDevices(videoDevs);
      if (videoDevs.length > 0 && !currentDeviceId) {
        const backCamera = videoDevs.find(device => device.label.toLowerCase().includes('back'));
        setCurrentDeviceId(backCamera ? backCamera.deviceId : videoDevs[0].deviceId);
      }
    },
    [currentDeviceId]
  );

  useEffect(() => {
    if (isCameraOn) {
      navigator.mediaDevices.enumerateDevices().then(handleDevices);
    }
  }, [isCameraOn, handleDevices]);

  const switchCamera = () => {
    if (videoDevices.length > 1) {
      const currentIndex = videoDevices.findIndex(device => device.deviceId === currentDeviceId);
      const nextIndex = (currentIndex + 1) % videoDevices.length;
      setCurrentDeviceId(videoDevices[nextIndex].deviceId);
    }
  };

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot({width: 336, height: 210});
    onCapture(imageSrc);
    setIsCameraOn(false);
  }, [webcamRef, onCapture]);

  const videoConstraints = {
    width: 336,
    height: 210,
    facingMode: 'environment',
    deviceId: currentDeviceId ? { exact: currentDeviceId } : undefined,
  };

  return (
    <div className="p-4 border rounded-lg space-y-2">
      <Label>{title}</Label>
      {image ? (
        <div className="flex items-center gap-2">
           <CheckCircle className="w-5 h-5 text-green-500" />
           <span className="text-sm font-medium text-green-600">Fotografía capturada</span>
           <Button variant="link" size="sm" onClick={() => onCapture(null)}>Reintentar</Button>
        </div>
      ) : isCameraOn ? (
        <div className="flex flex-col items-center gap-2">
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={videoConstraints}
            className="rounded-md w-full h-auto max-w-[336px]"
            onUserMedia={() => {
              navigator.mediaDevices.enumerateDevices().then(handleDevices);
            }}
          />
          <div className="flex gap-2">
            <Button onClick={capture} size="sm"><Camera className="w-4 h-4 mr-2"/>Capturar</Button>
            {videoDevices.length > 1 && (
              <Button onClick={switchCamera} size="sm" variant="outline"><RefreshCw className="w-4 h-4 mr-2"/>Cambiar Cámara</Button>
            )}
          </div>
        </div>
      ) : (
        <Button onClick={() => setIsCameraOn(true)} variant="outline"><Camera className="w-4 h-4 mr-2"/>Iniciar Cámara</Button>
      )}
    </div>
  );
};

const AssignForm = ({ onSubmit }) => {
  const [assignType, setAssignType] = useState('TAG');
  const [assignForm, setAssignForm] = useState({ idsae: '', asociado: '', direccion: '', tag: '', app: '' });
  const [availableTags, setAvailableTags] = useState([]);
  const [photos, setPhotos] = useState({ ineFront: null, ineBack: null, circulation: null });

  const handlePhotoCapture = (type, image) => {
    setPhotos(prev => ({ ...prev, [type]: image }));
  };
  
  const invokeEdgeFunction = async (query, params = []) => {
    const { data, error } = await supabase.functions.invoke('api-mysql', {
      body: { query, params },
    });
    if (error) throw new Error(error.message);
    if (data && data.error) throw new Error(data.error);
    return data;
  };

  useEffect(() => {
    const fetchAvailableTags = async () => {
      try {
        const query = "SELECT Etiqueta FROM Tags WHERE TAGNUEVA = 1 ORDER BY IDTags ASC";
        const data = await invokeEdgeFunction(query);
        setAvailableTags(data || []);
        if (data && data.length > 0) {
          setAssignForm(prev => ({...prev, tag: data[0].Etiqueta}));
        }
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: `No se pudieron cargar los tags disponibles: ${error.message}` });
      }
    };

    if(assignType === 'TAG') {
      fetchAvailableTags();
    }
  }, [assignType]);

  const handleAssignIdsaeSearch = async (idsae) => {
    setAssignForm(prev => ({...prev, idsae}));
    if (!idsae) {
      setAssignForm(prev => ({ ...prev, asociado: '', direccion: '' }));
      return
    };

    try {
      const query = `
        SELECT a.Nombre, d.Calle, d.NumInt, d.NumExt 
        FROM Asociado a 
        LEFT JOIN Direccion d ON a.IDSAE = d.IDSAE 
        WHERE a.IDSAE = ?
      `;
      const data = await invokeEdgeFunction(query, [idsae]);
      if (data && data.length > 0) {
        const result = data[0];
        setAssignForm(prev => ({ 
          ...prev, 
          asociado: result.Nombre || '', 
          direccion: [result.Calle, result.NumExt, result.NumInt].filter(Boolean).join(', ')
        }));
      } else {
        setAssignForm(prev => ({ ...prev, asociado: '', direccion: '' }));
      }
    } catch (error) {
      console.error("Error searching for IDSAE:", error);
      setAssignForm(prev => ({ ...prev, asociado: '', direccion: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      IDSAE: assignForm.idsae,
      Nombre: assignForm.asociado,
      Direccion: assignForm.direccion,
      Etiqueta: assignType === 'TAG' ? assignForm.tag : 'APP',
      Identificador: assignType === 'APP' ? assignForm.app : null,
      Tipo: assignType,
      photos
    };

    if (!data.IDSAE || !data.Nombre || !data.Direccion || (assignType === 'TAG' && !data.Etiqueta) || (assignType === 'APP' && !data.Identificador)) {
      toast({ variant: "destructive", title: "Campos incompletos", description: "Por favor, rellena todos los campos antes de continuar." });
      return;
    }
    
    if (!photos.ineFront || !photos.ineBack || !photos.circulation) {
        toast({ variant: "destructive", title: "Fotografías requeridas", description: "Por favor, captura las tres fotografías solicitadas." });
        return;
    }

    try {
      if (assignType === 'TAG') {
        const checkQuery = "SELECT IDSAE FROM Tags WHERE Etiqueta = ? AND TAGNUEVA != 1";
        const checkResult = await invokeEdgeFunction(checkQuery, [data.Etiqueta]);
        if (checkResult && checkResult.length > 0) {
          toast({ variant: "destructive", title: "TAG ya asignado", description: `El TAG ${data.Etiqueta} ya está asignado al IDSAE ${checkResult[0].IDSAE}.` });
          return;
        }
      } else { // APP
        const checkQuery = "SELECT IDSAE FROM Tags WHERE Identificador = ?";
        const checkResult = await invokeEdgeFunction(checkQuery, [data.Identificador]);
        if (checkResult && checkResult.length > 0) {
          toast({ variant: "destructive", title: "APP ya asignada", description: `El identificador de APP ${data.Identificador} ya está asignado al IDSAE ${checkResult[0].IDSAE}.` });
          return;
        }
      }
      onSubmit(data);
    } catch (error) {
      toast({ variant: "destructive", title: "Error de validación", description: `No se pudo verificar el acceso: ${error.message}` });
    }
  };

  return (
    <Card className="max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle>Asignar Nuevo Tag o APP</CardTitle>
        <CardDescription>Rellena los campos para asignar un nuevo acceso.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <RadioGroup value={assignType} onValueChange={setAssignType} className="flex gap-4 mb-6">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="TAG" id="r1" />
              <Label htmlFor="r1" className="flex items-center gap-2 cursor-pointer"><TagIcon className="w-4 h-4" /> TAG</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="APP" id="r2" />
              <Label htmlFor="r2" className="flex items-center gap-2 cursor-pointer"><Smartphone className="w-4 h-4" /> APP</Label>
            </div>
          </RadioGroup>
          
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="idsae">IDSAE</Label>
              <Input id="idsae" placeholder="Introduce el IDSAE" value={assignForm.idsae} onChange={e => handleAssignIdsaeSearch(e.target.value)} required/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="asociado">Asociado</Label>
              <Input id="asociado" placeholder="Nombre completo" value={assignForm.asociado} onChange={e => setAssignForm(p => ({ ...p, asociado: e.target.value }))} required/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input id="direccion" placeholder="Calle, Número Ext, Número Int" value={assignForm.direccion} onChange={e => setAssignForm(p => ({ ...p, direccion: e.target.value }))} required/>
            </div>
            {assignType === 'TAG' ? (
              <div className="space-y-2">
                <Label htmlFor="tag">Tag</Label>
                <select id="tag" className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 ring-offset-white focus:outline-none focus:ring-2 focus:ring-[#84b6f4]" value={assignForm.tag} onChange={e => setAssignForm(p => ({ ...p, tag: e.target.value }))} required>
                  <option value="" disabled>Selecciona un Tag disponible</option>
                  {availableTags.map(t => <option key={t.Etiqueta} value={t.Etiqueta}>{t.Etiqueta}</option>)}
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="app">APP (Identificador Numérico)</Label>
                <Input id="app" type="number" placeholder="123456789" value={assignForm.app} onChange={e => setAssignForm(p => ({ ...p, app: e.target.value }))} required/>
              </div>
            )}
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-semibold">Captura de Documentos</h3>
            <PhotoCapture title="Fotografía del frente del INE del asociado" onCapture={(img) => handlePhotoCapture('ineFront', img)} image={photos.ineFront} />
            <PhotoCapture title="Fotografía del reverso del INE del asociado" onCapture={(img) => handlePhotoCapture('ineBack', img)} image={photos.ineBack} />
            <PhotoCapture title="Fotografía de la tarjeta de circulación" onCapture={(img) => handlePhotoCapture('circulation', img)} image={photos.circulation} />
          </div>

          {assignType === 'TAG' ? (
            <Button type="submit" className="w-full bg-[#84b6f4] hover:bg-[#6da3e6] text-white">
              <TagIcon className="w-4 h-4 mr-2" />
              Asignar TAG y Firmar Comprobante
            </Button>
          ) : (
             <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <Save className="w-4 h-4 mr-2" />
              Registrar APP y Firmar Comprobante
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

export default AssignForm;
