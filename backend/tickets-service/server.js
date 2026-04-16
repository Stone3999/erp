import Fastify from 'fastify';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const fastify = Fastify({ logger: true });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const createTicketSchema = {
  body: {
    type: 'object',
    required: ['title', 'workspace_id', 'created_by'],
    properties: {
      title: { type: 'string', minLength: 3 },
      description: { type: 'string' },
      priority: { type: 'string', enum: ['Baja', 'Media', 'Alta'] },
      status: { type: 'string', enum: ['Pendiente', 'En Progreso', 'Revisión', 'Finalizado'] },
      assigned_to: { type: ['string', 'null'] },
      workspace_id: { type: 'string' },
      created_by: { type: 'string' },
      due_date: { type: ['string', 'null'] }
    }
  }
};

const updateTicketSchema = {
  body: {
    type: 'object',
    properties: {
      title: { type: 'string', minLength: 3 },
      description: { type: 'string' },
      priority: { type: 'string' },
      status: { type: 'string' },
      assigned_to: { type: ['string', 'null'] },
      due_date: { type: ['string', 'null'] }
    }
  }
};

const commentSchema = {
  body: {
    type: 'object',
    required: ['user_name', 'comment'],
    properties: {
      user_name: { type: 'string' },
      comment: { type: 'string', minLength: 1 }
    }
  }
};

fastify.get('/', async (request, reply) => {
  try {
    const { workspace_id } = request.query;
    let query = supabase.from('tickets').select('*, users(name)');
    if (workspace_id) { query = query.eq('workspace_id', workspace_id); }
    const { data, error } = await query;
    if (error) throw error;
    const enrichedTickets = (data || []).map(t => ({ ...t, creator_name: t.users?.name || 'Sistema' }));
    return { statusCode: 200, intOpCode: 'SxTK200', data: enrichedTickets };
  } catch (err) { return reply.code(500).send({ statusCode: 500, intOpCode: 'ExTK500', message: 'Error al obtener tickets' }); }
});

fastify.post('/', { schema: createTicketSchema }, async (request, reply) => {
  try {
    const { title, description, priority, status, assigned_to, workspace_id, created_by, due_date } = request.body;
    const { data, error } = await supabase.from('tickets').insert([{ 
        title, 
        description: description || '', 
        priority: priority || 'Media', 
        status: status || 'Pendiente', 
        assigned_to: assigned_to || null, 
        workspace_id, 
        created_by,
        due_date: due_date || null
    }]).select().single();
    if (error) return reply.code(500).send({ statusCode: 500, intOpCode: 'ExTK500', message: error.message });
    return { statusCode: 201, intOpCode: 'SxTK201', data };
  } catch (err) { return reply.code(500).send({ statusCode: 500, intOpCode: 'ExTK500', message: 'Error interno' }); }
});

fastify.get('/:id', async (request, reply) => {
  try {
    const { id } = request.params;
    const { data: ticket, error } = await supabase.from('tickets').select('*, users!created_by(name)').eq('id', id).maybeSingle();
    if (error || !ticket) throw error || new Error('No encontrado');
    const { data: comments } = await supabase.from('ticket_comments').select('*').eq('ticket_id', id).order('created_at', { ascending: true });
    return { statusCode: 200, intOpCode: 'SxTK200', data: { ...ticket, creator_name: ticket.users?.name || 'Sistema', comments: comments || [] } };
  } catch (err) { return reply.code(500).send({ statusCode: 500, intOpCode: 'ExTK500', message: err.message }); }
});

fastify.post('/:id/comments', { schema: commentSchema }, async (request, reply) => {
  try {
    const { id: ticket_id } = request.params;
    const { user_name, comment } = request.body;
    const { data, error } = await supabase.from('ticket_comments').insert([{ ticket_id, user_name, comment }]).select().single();
    if (error) throw error;
    return { statusCode: 201, intOpCode: 'SxTK201', data };
  } catch (err) { return reply.code(500).send({ statusCode: 500, intOpCode: 'ExTK500', message: err.message }); }
});

fastify.patch('/:id', { schema: updateTicketSchema }, async (request, reply) => {
  try {
    const { id } = request.params;
    const { data, error } = await supabase.from('tickets').update(request.body).eq('id', id).select().single();
    if (error) throw error;
    return { statusCode: 200, intOpCode: 'SxTK200', data };
  } catch (err) { return reply.code(500).send({ statusCode: 500, intOpCode: 'ExTK500', message: err.message }); }
});

fastify.delete('/:id', async (request, reply) => {
  try {
    const { id } = request.params;
    const { error } = await supabase.from('tickets').delete().eq('id', id);
    if (error) throw error;
    return { statusCode: 200, intOpCode: 'SxTK200', data: { message: 'Ticket eliminado' } };
  } catch (err) { return reply.code(500).send({ statusCode: 500, intOpCode: 'ExTK500', message: err.message }); }
});

const start = async () => {
  try {
    const port = 3002;
    await fastify.listen({ port, host: '0.0.0.0' });
  } catch (err) { process.exit(1); }
};
start();