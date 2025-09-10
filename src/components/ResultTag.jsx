import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Ban, ShieldAlert, ShieldOff } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

const ResultTag = ({ result, onBaja, onSuspend }) => {
  const [comment, setComment] = useState("");
  const isVigente = result.ValidaVigencia === 0;
  const isActiva = result.Activa === 0;
  const isSuspended = result.isSuspended || result.isSuspendedView;

  const suspendedBgUrl = 'https://storage.googleapis.com/hostinger-horizons-assets-prod/f80cb88e-90d5-4a1b-b1dd-40404cb3c7a5/c066404b49dd91cfc5e0ae0331f48d79.png';
  
  const cardStyle = isSuspended ? {
    backgroundImage: `url(${suspendedBgUrl})`,
    backgroundSize: '50%',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  } : {};

  // Determine if it's an APP or TAG
  const isApp = result.Etiqueta === 'APP' || (result.isSuspendedView && result.Identificador);
  const displayName = isApp ? 'APP' : 'TAG';
  const displayIdentifier = isApp ? result.Identificador : (result.Etiqueta || result.suspendedTag);


  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.4, type: 'spring' }}
      style={cardStyle}
      className={`relative overflow-hidden p-5 rounded-lg shadow-md border ${
        isSuspended ? 'bg-blend-overlay bg-white/80' : 
        !isActiva && !result.isSuspendedView ? 'bg-red-100 border-red-400' : 'bg-white border-slate-200'
      }`}
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-black">
        <div>
          <span className="text-xs font-semibold text-slate-500">IDSAE</span>
          <p className="font-bold text-blue-600">{result.IDSAE}</p>
        </div>

        {isSuspended ? (
          <div className="col-span-2">
            <span className="text-xs font-semibold text-slate-500">Comentario de Suspensión</span>
            <p className="font-medium text-red-700">{result.Comentario || 'N/A'}</p>
          </div>
        ) : (
          <>
            <div className="col-span-2">
              <span className="text-xs font-semibold text-slate-500">Nombre</span>
              <p className="font-medium">{result.Nombre}</p>
            </div>
            <div className="col-span-2">
              <span className="text-xs font-semibold text-slate-500">Dirección</span>
              <p className="font-medium">{`${result.Calle || ''} ${result.NumExt || ''}, Int. ${result.NumInt || ''}`}</p>
            </div>
          </>
        )}
        
        <div>
          <span className="text-xs font-semibold text-slate-500">{displayName}</span>
          <p className="font-medium">{displayIdentifier}</p>
        </div>

        {result.Etiqueta === 'APP' && result.Identificador && !result.isSuspendedView && (
          <div>
            <span className="text-xs font-semibold text-slate-500">Identificador</span>
            <p className="font-bold text-purple-600">{result.Identificador}</p>
          </div>
        )}

        <div className="col-span-2 mt-2 pt-2 border-t border-slate-200">
          <span className="text-xs font-semibold text-slate-500">{isSuspended ? 'Fecha de Suspensión' : 'Vigencia / Fecha'}</span>
          <p className={`font-bold text-base ${isVigente && !isSuspended ? 'text-green-600' : 'text-red-600'}`}>
            {result.Vigencia || 'N/A'}
          </p>
          {!result.isSuspendedView && (
             isSuspended ? (
              <p className="text-xs font-bold" style={{ color: '#ff6600' }}>
                SUSPENDIDO
              </p>
            ) : (
              <p className={`text-xs font-bold ${isVigente ? 'text-green-500' : 'text-red-500'}`}>
                {isVigente ? 'ASOCIADO CON TAG VIGENTE' : 'ASOCIADO CON PAGO PENDIENTE'}
              </p>
            )
          )}
        </div>
      </div>
      
      <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2">
        {!isSuspended && isActiva && !result.isSuspendedView && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button style={{ backgroundColor: '#ff6600', color: 'white' }} size="sm" className="hover:bg-[#e65c00}">
                  <ShieldAlert className="w-4 h-4 mr-2" />
                  Suspender
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Suspender: {result.Etiqueta === 'APP' ? `APP ${result.Identificador}` : result.Etiqueta}</AlertDialogTitle>
                <AlertDialogDescription>
                  Este acceso se agregará a la bitácora de mal uso. Por favor, ingresa el motivo de la suspensión.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="grid w-full gap-1.5">
                <Label htmlFor="comment">Comentario</Label>
                <Textarea placeholder="Describe el motivo aquí..." id="comment" value={comment} onChange={(e) => setComment(e.target.value)} />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => onSuspend(result, comment)} style={{ backgroundColor: '#ff6600', color: 'white' }}>
                  <ShieldOff className="w-4 h-4 mr-2" />
                  Marcar como suspendido
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        
        {(isActiva || result.isSuspendedView) && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onBaja(result)}
          >
            <Ban className="w-4 h-4 mr-2" />
            Baja
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default ResultTag;