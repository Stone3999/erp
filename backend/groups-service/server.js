import Fastify from 'fastify';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const fastify = Fastify({ logger: true });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

fastify.get('/', async (request, reply) => {
  try {
    const user_id = request.headers['x-user-id']; // Asumimos que el Gateway pasa el ID
    const { data: workspaces, error } = await supabase
      .from('workspaces')
      .select('*, users!created_by(name)');

    if (error) throw error;

    const enrichedWorkspaces = await Promise.all(workspaces.map(async (ws) => {
      // Conteos detallados
      const { data: tkStats } = await supabase.from('tickets').select('status, assigned_to').eq('workspace_id', ws.id);
      
      const stats = {
        total: tkStats?.length || 0,
        pendientes: tkStats?.filter(t => t.status === 'Pendiente').length || 0,
        activos: tkStats?.filter(t => t.status === 'En Progreso' || t.status === 'Revisión').length || 0,
        terminados: tkStats?.filter(t => t.status === 'Finalizado').length || 0,
        asignadosMi: tkStats?.filter(t => t.assigned_to === user_id || t.assigned_to === request.headers['x-user-name']).length || 0
      };

      const { count: membersCount } = await supabase
        .from('workspace_members')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', ws.id);

      return {
        ...ws,
        creator_name: ws.users?.name || 'Sistema',
        stats,
        miembros: membersCount || 0
      };
    }));

    return { statusCode: 200, data: enrichedWorkspaces };
  } catch (err) {
    return reply.code(500).send({ statusCode: 500, message: err.message });
  }
});

// NUEVA RUTA: PATCH para actualizar grupos y miembros
fastify.patch('/:id', async (request, reply) => {
  try {
    const { id } = request.params;
    const { name, category, level, members, created_by } = request.body;
    
    // 1. Actualizar datos básicos del Workspace
    const { data, error } = await supabase
      .from('workspaces')
      .update({ name, category, level })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // 2. Si se envían miembros, sincronizar la tabla workspace_members
    if (members && members.length > 0) {
      // Borramos miembros actuales
      await supabase.from('workspace_members').delete().eq('workspace_id', id);

      // Insertamos la nueva lista
      const membersToInsert = members.map((userId) => ({
        workspace_id: id,
        user_id: userId
      }));

      // Nos aseguramos de que el creador (o quien edita) siga siendo miembro/admin
      if (created_by && !members.includes(created_by)) {
          membersToInsert.push({ workspace_id: id, user_id: created_by });
      }

      await supabase.from('workspace_members').insert(membersToInsert);
    }

    return { statusCode: 200, data };
  } catch (err) {
    return reply.code(500).send({ statusCode: 500, message: err.message });
  }
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