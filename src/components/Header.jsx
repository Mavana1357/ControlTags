import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, PlusCircle, ShieldOff, CreditCard, FolderOpen } from 'lucide-react';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import ComprobantesViewer from '@/components/ComprobantesViewer';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const Header = ({ onSetView, onSuspendedSearch, invokeEdgeFunction }) => {
  const { signOut } = useAuth();

  return (
    <div className="flex flex-col md:flex-row justify-between items-center mb-8 pb-4 border-b border-slate-200 gap-6">
      <div className="flex flex-col items-center md:items-start text-center md:text-left">
        <img src="https://storage.googleapis.com/hostinger-horizons-assets-prod/f80cb88e-90d5-4a1b-b1dd-40404cb3c7a5/1e2c71fd9e37a3fad196bc8157791ab3.png" alt="Logo" className="h-16 w-auto" />
        <div className="mt-2">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">Consulta y Control de Tags</h1>
          <p className="text-slate-500">Comunidad Decidida</p>
        </div>
      </div>
      <div className="flex flex-wrap justify-center items-center gap-2">
         <Button onClick={() => onSetView('payment')} style={{ backgroundColor: '#00C040', color: 'white' }} className="hover:bg-[#00a035]">
           <CreditCard className="w-4 h-4 mr-2" />
           Registrar Pago
        </Button>
        <Button onClick={onSuspendedSearch} style={{ backgroundColor: '#ff6600', color: 'white' }} className="hover:bg-[#e65c00]">
           <ShieldOff className="w-4 h-4 mr-2" />
           Suspendidos
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button style={{ backgroundColor: '#FFEB3B', color: 'black' }} className="hover:bg-[#FFD700]"><FolderOpen className="w-4 h-4 mr-2"/> Comprobantes</Button>
          </DialogTrigger>
          <ComprobantesViewer invokeEdgeFunction={invokeEdgeFunction} />
        </Dialog>
        <Button onClick={() => onSetView('assign')} className="bg-[#84b6f4] hover:bg-[#6da3e6] text-white">
          <PlusCircle className="w-4 h-4 mr-2" />
          Asignar
        </Button>
        <Button onClick={signOut} variant="outline">
          <LogOut className="w-4 h-4 mr-2" />
          Salir
        </Button>
      </div>
    </div>
  );
};

export default Header;