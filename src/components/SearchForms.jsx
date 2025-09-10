import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Hash, User, Tag as TagIcon } from 'lucide-react';

const SearchForms = ({ onSearch, searchValues, setSearchValues }) => {
  const searchConfigs = [
    { type: 'idsae', icon: Hash, color: 'text-blue-500', placeholder: 'Introduce el IDSAE' },
    { type: 'nombre', icon: User, color: 'text-purple-500', placeholder: 'un nombre' },
    { type: 'tag', icon: TagIcon, color: 'text-orange-500', placeholder: 'una etiqueta o identificador' },
  ];

  const handleInputChange = (type, value) => {
    // Update the state for all fields to ensure only one is active
    const newSearchValues = { idsae: '', nombre: '', tag: '' };
    newSearchValues[type] = value;
    setSearchValues(newSearchValues);
    onSearch(type, value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {searchConfigs.map((config, index) => (
        <motion.div
          key={config.type}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 * (index + 1) }}
        >
          <Card className="h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <config.icon className={`w-5 h-5 ${config.color}`} />
                Búsqueda por {config.type.toUpperCase()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder={`Escribe ${config.placeholder}`}
                value={searchValues[config.type]}
                onChange={(e) => handleInputChange(config.type, e.target.value)}
              />
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default SearchForms;