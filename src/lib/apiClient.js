
import { supabase } from '@/lib/customSupabaseClient';

export const dbQuery = async (query, params) => {
  const { data, error } = await supabase.functions.invoke('api-mysql', {
    body: JSON.stringify({ query, params }),
  });

  if (error) {
    console.error('Supabase Function Error:', error.message);
    throw new Error('Error al ejecutar la consulta en el servidor.');
  }

  if (data.error) {
    console.error('Server-side Error:', data.error);
    throw new Error(data.error);
  }

  return data;
};
