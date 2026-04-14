import Fastify from 'fastify';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const fastify = Fastify({ logger: true });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

fastify.get('/', async (request, reply) => {
  try {
    const { workspace_id } = request.query;
    let query = supabase.from('tickets').select('*, users!created_by(name)');
    if (workspace_id) {
       query = query.eq('workspace_id', workspace_id);
    }
    const { data, error } = await query;
    if (error) throw error;
    
    const enrichedTickets = data.map(t => ({
      ...t,
      creator_name: t.users?.name || 'Sistema'
    }));

    return { statusCode: 200, data: enrichedTickets };
  } catch (err) {
    console.error('[Tickets GET Error]:', err);
    return reply.code(500).send({ statusCode: 500, message: 'Error al obtener tickets' });
  }
});

fastify.post('/', async (request, reply) => {
  try {
    const { title, description, priority, status, assigned_to, workspace_id, created_by } = request.body;
    console.log('[Tickets POST] Recibido:', { title, workspace_id, created_by });

    if (!title || !workspace_id) {
      return reply.code(400).send({ statusCode: 400, message: 'Título y Workspace son obligatorios' });
    }

    const { data, error } = await supabase
      .from('tickets')
      .insert([{ 
        title, 
        description: description || '', 
        priority: priority || 'Media', 
        status: status || 'Pendiente', 
        assigned_to: assigned_to || null, 
        workspace_id, 
        created_by 
      }])
      .select()
      .single();
    
    if (error) {
      console.error('[Supabase Tickets Insert Error]:', error);
      return reply.code(500).send({ statusCode: 500, message: error.message });
    }

    return { statusCode: 201, intOpCode: 'SxTK201', data };
  } catch (err) {
    console.error('[Tickets POST Catch]:', err);
    return reply.code(500).send({ statusCode: 500, message: 'Error interno' });
  }
});

fastify.patch('/:id', async (request, reply) => {
  try {
    const { id } = request.params;
    const { data, error } = await supabase.from('tickets').update(request.body).eq('id', id).select().single();
    if (error) throw error;
    return { statusCode: 200, data };
  } catch (err) {
    return reply.code(500).send({ statusCode: 500, message: err.message });
  }
});

fastify.delete('/:id', async (request, reply) => {
  try {
    const { id } = request.params;
    const { error } = await supabase.from('tickets').delete().eq('id', id);
    if (error) throw error;
    return { statusCode: 200, data: { message: 'Ticket eliminado' } };
  } catch (err) {
    return reply.code(500).send({ statusCode: 500, message: err.message });
  }
});

const start = async () => {
  try {
    const port = 3002;
    await fastify.listen({ port, host: '0.0.0.0' });
  } catch (err) {
    process.exit(1);
  }
};
start();