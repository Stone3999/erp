import Fastify from 'fastify';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const fastify = Fastify({ logger: true });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

fastify.get('/', async (request, reply) => {
  const { data, error } = await supabase.from('workspaces').select('*');
  return { statusCode: 200, data };
});

// NUEVA RUTA PARA OBTENER MIEMBROS DE UN GRUPO
fastify.get('/:id/members', async (request, reply) => {
  const { id } = request.params;
  const { data, error } = await supabase
    .from('workspace_members')
    .select('user_id, users(name, email)')
    .eq('workspace_id', id);
  
  if (error) return reply.code(500).send({ statusCode: 500, message: error.message });
  
  // Mapeamos para que sea más fácil de leer en el front (Limpiado de TS)
  const members = data.map((m) => ({
    id: m.user_id,
    name: m.users.name,
    email: m.users.email
  }));
  
  return { statusCode: 200, data: members };
});

fastify.post('/', async (request, reply) => {
  try {
    const { name, category, level, created_by, members } = request.body;
    
    // 1. Crear el Workspace
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .insert([{ name, category, level, created_by }])
      .select()
      .single();
    
    if (wsError) throw wsError;

    // 2. Si hay miembros, agregarlos a la tabla intermedia
    if (members && members.length > 0) {
      const membersToInsert = members.map((userId) => ({
        workspace_id: workspace.id,
        user_id: userId
      }));
      
      // Agregamos también al creador como miembro por defecto
      membersToInsert.push({ workspace_id: workspace.id, user_id: created_by });

      await supabase.from('workspace_members').insert(membersToInsert);
    }

    return { statusCode: 201, data: workspace };
  } catch (err) {
    return reply.code(500).send({ statusCode: 500, message: err.message });
  }
});

fastify.delete('/:id', async (request, reply) => {
  const { id } = request.params;
  await supabase.from('workspaces').delete().eq('id', id);
  return { statusCode: 200, message: 'Eliminado' };
});

const start = async () => {
  try {
    const port = 3003;
    await fastify.listen({ port, host: '0.0.0.0' });
  } catch (err) { process.exit(1); }
};
start();