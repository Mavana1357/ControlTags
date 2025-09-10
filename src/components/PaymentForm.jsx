
import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search, Calendar as CalendarIcon, UserCheck } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const PaymentForm = ({ onSubmit, invokeEdgeFunction }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newVigencia, setNewVigencia] = useState('');
  const [date, setDate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleUserSearch = useCallback(async () => {
    if (!searchTerm.trim()) {
      toast({ variant: "destructive", title: "Término de búsqueda vacío", description: "Por favor, ingresa un nombre para buscar." });
      return;
    }
    setIsLoading(true);
    try {
      const query = "SELECT IDSAE, Nombre FROM Asociado WHERE Nombre LIKE ?";
      const params = [`%${searchTerm}%`];
      const data = await invokeEdgeFunction(query, params);
      setSearchResults(data || []);
      if (!data || data.length === 0) {
        toast({ title: "Sin resultados", description: "No se encontraron asociados con ese nombre." });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error en la búsqueda", description: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, invokeEdgeFunction]);
  
  const handleDateSelect = (selectedDate) => {
    setDate(selectedDate);
    if (selectedDate) {
      setNewVigencia(format(selectedDate, 'dd/MM/yyyy'));
    } else {
      setNewVigencia('');
    }
  };
  
  const handleInputChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 2) {
      value = `${value.substring(0, 2)}/${value.substring(2)}`;
    }
    if (value.length > 5) {
      value = `${value.substring(0, 5)}/${value.substring(5, 9)}`;
    }
    setNewVigencia(value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedUser) {
        toast({ variant: "destructive", title: "Usuario no seleccionado", description: "Por favor, selecciona un usuario de la lista." });
        return;
    }
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(newVigencia)) {
        toast({ variant: "destructive", title: "Formato de fecha inválido", description: "Usa el formato dd/MM/yyyy." });
        return;
    }
    onSubmit(selectedUser.Nombre, newVigencia);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-slate-800">
            Registrar Pago y Actualizar Vigencia
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          <div className="space-y-4">
            <Label htmlFor="search-name" className="text-lg font-semibold">1. Buscar Asociado</Label>
            <div className="flex gap-2">
              <Input
                id="search-name"
                type="text"
                placeholder="Ingresa el nombre del asociado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-12"
              />
              <Button onClick={handleUserSearch} disabled={isLoading} className="h-12">
                <Search className="w-5 h-5 mr-2" />
                {isLoading ? 'Buscando...' : 'Buscar'}
              </Button>
            </div>
            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto border p-2 rounded-md">
                {searchResults.map(user => (
                  <div
                    key={user.IDSAE}
                    onClick={() => {
                        setSelectedUser(user);
                        setSearchTerm(user.Nombre);
                        setSearchResults([]);
                    }}
                    className="p-2 rounded-md cursor-pointer hover:bg-slate-100 flex justify-between items-center"
                  >
                    <span>{user.Nombre}</span>
                    <span className="text-xs text-slate-500">ID: {user.IDSAE}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
              <Label className="text-lg font-semibold">2. Actualizar Información</Label>
              {selectedUser && (
                <div className="p-3 bg-blue-100 border border-blue-200 rounded-md flex items-center gap-3">
                  <UserCheck className="w-5 h-5 text-blue-600"/>
                  <div>
                    <p className="font-semibold">{selectedUser.Nombre}</p>
                    <p className="text-sm text-slate-600">IDSAE: {selectedUser.IDSAE}</p>
                  </div>
                </div>
              )}
               <div className="space-y-2">
                <Label htmlFor="new-vigencia">Nueva Vigencia</Label>
                <div className="flex gap-2">
                  <Input
                    id="new-vigencia"
                    type="text"
                    placeholder="dd/MM/yyyy"
                    value={newVigencia}
                    onChange={handleInputChange}
                    className="h-12"
                    disabled={!selectedUser}
                    maxLength="10"
                    required
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[48px] h-12 p-0",
                          !date && "text-muted-foreground"
                        )}
                        disabled={!selectedUser}
                      >
                        <CalendarIcon className="h-5 w-5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={handleDateSelect}
                        initialFocus
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={!selectedUser || !newVigencia} className="w-full h-12 text-lg font-bold" style={{backgroundColor: '#00C040'}}>
              Actualizar Vigencia
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PaymentForm;
