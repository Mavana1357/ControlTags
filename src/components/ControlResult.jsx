
import React from 'react';
import { motion } from 'framer-motion';
import { Tag, Smartphone, ShieldAlert } from 'lucide-react';

const ControlResult = ({ result }) => {
  const isVigente = result.ValidaVigencia === 0;
  const isSuspended = result.isSuspended;
  const isDeactivated = result.Activa === 1;

  const suspendedBgUrl = 'https://storage.googleapis.com/hostinger-horizons-assets-prod/f80cb88e-90d5-4a1b-b1dd-40404cb3c7a5/c066404b49dd91cfc5e0ae0331f48d79.png';
  
  const cardStyle = isSuspended ? {
    backgroundImage: `url(${suspendedBgUrl})`,
    backgroundSize: '40%',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backgroundBlendMode: 'overlay',
  } : {};
  
  const getBorderColor = () => {
    if (isDeactivated) return 'border-red-500';
    if (isSuspended) return 'border-orange-500';
    return isVigente ? 'border-green-500' : 'border-red-500';
  };
  
  const getHeaderBgColor = () => {
    if (isDeactivated) return 'bg-red-500';
    if (isSuspended) return 'bg-orange-500';
    return isVigente ? 'bg-green-500' : 'bg-red-500';
  };

  const getStatusText = () => {
    if (isDeactivated) return 'TAG DADO DE BAJA';
    if (isSuspended) return 'SUSPENDIDO';
    return isVigente ? 'VIGENTE' : 'NO VIGENTE';
  };
  
  const isApp = result.Etiqueta === 'APP';
  const displayIdentifier = isApp ? result.Identificador : (result.Etiqueta || result.suspendedTag);
  const displayName = isApp ? 'APP' : 'TAG';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      style={isDeactivated ? {} : cardStyle}
      className={`relative overflow-hidden rounded-lg shadow-lg border-2 ${getBorderColor()} ${isDeactivated ? 'bg-red-100' : ''}`}
    >
      <div className={`p-3 text-white font-bold text-lg text-center ${getHeaderBgColor()}`}>
        {getStatusText()}
      </div>
      <div className="p-4 space-y-3 text-center">
        <div className="flex items-center justify-center gap-3">
          {isApp ? 
            <Smartphone className="w-6 h-6 text-slate-600"/> : 
            <Tag className="w-6 h-6 text-slate-600"/>
          }
          <div>
            <p className="text-sm font-semibold text-slate-500">{displayName}</p>
            <p className="font-bold text-lg text-slate-800">{displayIdentifier}</p>
          </div>
        </div>
        
        {!isSuspended && !isDeactivated && (
            <div>
                <p className="text-sm font-semibold text-slate-500">Vigencia</p>
                <p className="font-medium text-slate-700">{result.Vigencia || 'N/A'}</p>
            </div>
        )}

        {isSuspended && !isDeactivated && (
          <div className="mt-2 pt-3 border-t border-orange-200">
            <div className="flex items-center justify-center gap-2 text-orange-600 font-bold mb-1">
                <ShieldAlert className="w-5 h-5"/>
                <span>Información de Suspensión</span>
            </div>
            <p className="text-sm text-slate-700"><span className="font-semibold">Fecha:</span> {result.FechaSuspension || 'N/A'}</p>
            <p className="text-sm text-slate-700"><span className="font-semibold">Motivo:</span> {result.Comentario || 'No especificado'}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ControlResult;
