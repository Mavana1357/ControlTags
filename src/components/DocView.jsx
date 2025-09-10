
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import SignatureCanvas from 'react-signature-canvas';
import { Trash2, Share2, ArrowLeft, Camera, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { generateAndUploadPdf } from '@/lib/pdfGenerator';
import Webcam from 'react-webcam';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

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


const DocView = ({ type, data, onBack, onPdfGenerated }) => {
  const sigCanvas = useRef({});
  const [bajaType, setBajaType] = useState('whatsapp');
  const [bajaPhotos, setBajaPhotos] = useState({ ineFront: null, ineBack: null });
  const [isUploading, setIsUploading] = useState(false);

  const invokeEdgeFunction = async (query, params = []) => {
    const { data, error } = await supabase.functions.invoke('api-mysql', {
      body: { query, params },
    });
    if (error) throw new Error(error.message);
    if (data && data.error) throw new Error(data.error);
    return data;
  };

  const handlePhotoCapture = (type, image) => {
    setBajaPhotos(prev => ({ ...prev, [type]: image }));
  };

  const handleGenerate = async () => {
    setIsUploading(true);
    let signature = null;
    let photos = null;

    if (type === 'alta') {
      signature = !sigCanvas.current.isEmpty() ? sigCanvas.current.getTrimmedCanvas().toDataURL('image/png') : null;
      photos = data.photos;
    } else if (type === 'baja' && bajaType === 'presencial') {
      signature = !sigCanvas.current.isEmpty() ? sigCanvas.current.getTrimmedCanvas().toDataURL('image/png') : null;
      photos = bajaPhotos;
    }

    const docDetails = { ...data, bajaType, photos };
    
    try {
      const { fileUrl } = await generateAndUploadPdf(type, docDetails, signature);

      let query;
      let params;
      const etiqueta = docDetails.Etiqueta;
      const identificador = docDetails.Identificador;
      const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');


      if (type === 'alta') {
          query = "UPDATE Tags SET DocAltaTag = ? WHERE IDSAE = ? AND (Etiqueta = ? OR Identificador = ?)";
          params = [fileUrl, docDetails.IDSAE, etiqueta, identificador];
      } else { // baja
          if (bajaType === 'presencial') {
              query = "UPDATE Tags SET DocCancelacion = ?, FechaActualizacion = ? WHERE IDSAE = ? AND (Etiqueta = ? OR Identificador = ?)";
              params = [fileUrl, currentDate, docDetails.IDSAE, etiqueta, identificador];
          } else { // whatsapp
              query = "UPDATE Tags SET CancelacionWA = ?, FechaActualizacion = ? WHERE IDSAE = ? AND (Etiqueta = ? OR Identificador = ?)";
              params = [fileUrl, currentDate, docDetails.IDSAE, etiqueta, identificador];
          }
      }
      
      await invokeEdgeFunction(query, params);

      toast({
        title: "Éxito",
        description: `PDF subido y URL guardada en la base de datos.`,
        action: <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-white underline">Ver PDF</a>,
      });
      onPdfGenerated();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al generar comprobante",
        description: error.message,
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  const renderBajaOptions = () => (
    <div className="space-y-6">
       <RadioGroup value={bajaType} onValueChange={setBajaType} className="flex gap-4 my-4">
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="whatsapp" id="b1" />
          <Label htmlFor="b1">Baja por WhatsApp</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="presencial" id="b2" />
          <Label htmlFor="b2">Baja Presencial</Label>
        </div>
      </RadioGroup>

      {bajaType === 'presencial' && (
        <div className="space-y-4 p-4 border-t">
            <h3 className="text-lg font-semibold">Baja Presencial</h3>
            <div className="space-y-2">
              <Label>Firma del Propietario / Representante</Label>
              <div className="rounded-lg border border-dashed border-slate-400 bg-slate-50">
                <SignatureCanvas ref={sigCanvas} penColor='black' canvasProps={{ className: 'w-full h-[150px]' }} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => sigCanvas.current.clear()}><Trash2 className="w-4 h-4 mr-2" /> Limpiar</Button>
              </div>
            </div>
            <PhotoCapture title="Fotografía del frente del INE del asociado" onCapture={(img) => handlePhotoCapture('ineFront', img)} image={bajaPhotos.ineFront} />
            <PhotoCapture title="Fotografía del reverso del INE del asociado" onCapture={(img) => handlePhotoCapture('ineBack', img)} image={bajaPhotos.ineBack} />
        </div>
      )}
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card className="max-w-3xl mx-auto shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Comprobante de {type === 'baja' ? 'Baja' : 'Alta'} de Acceso</CardTitle>
            <CardDescription>Confirma la generación del documento.</CardDescription>
          </div>
          <img src="https://storage.googleapis.com/hostinger-horizons-assets-prod/f80cb88e-90d5-4a1b-b1dd-40404cb3c7a5/4f0066d0557165926ac727a8ad71f9be.png" alt="Logo" className="h-12 w-auto" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 border rounded-lg bg-slate-50 text-sm text-black">
            <p className="font-bold">Propietario:</p>
            <p>{data.Nombre}</p>
            <p className="font-bold mt-2">Detalle:</p>
             <p>{data.Etiqueta === 'APP' ? `APP: ${data.Identificador}` : `TAG: ${data.Etiqueta}`} (IDSAE: {data.IDSAE})</p>
          </div>

          {type === 'alta' && (
            <div className="space-y-2">
              <Label>Firma del Propietario / Representante</Label>
              <div className="rounded-lg border border-dashed border-slate-400 bg-slate-50">
                <SignatureCanvas ref={sigCanvas} penColor='black' canvasProps={{ className: 'w-full h-[150px]' }} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => sigCanvas.current.clear()}><Trash2 className="w-4 h-4 mr-2" /> Limpiar</Button>
              </div>
            </div>
          )}

          {type === 'baja' && renderBajaOptions()}

          <div className="flex gap-4">
            <Button onClick={handleGenerate} className="flex-1 bg-primary hover:bg-primary-hover text-white" disabled={isUploading}>
              {isUploading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Subiendo...</>
              ) : (
                <><Share2 className="w-4 h-4 mr-2" /> Generar y Subir PDF</>
              )}
            </Button>
            <Button onClick={onBack} variant="outline" className="flex-1" disabled={isUploading}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Menú Principal
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DocView;
