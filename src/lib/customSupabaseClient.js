import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bwzvwmnrcvipsczkdjux.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3enZ3bW5yY3ZpcHNjemtkanV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2ODEwNjIsImV4cCI6MjA2ODI1NzA2Mn0.VtwQ_i8A0Ik0ouJ5p3EiHIEX8jVPtdpMJkETdwBhXHg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);