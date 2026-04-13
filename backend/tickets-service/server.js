import Fastify from 'fastify';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const fastify = Fastify({ logger: true });
const supabase = createClient(process.env.SUPABASE_URL || 'https://placeholder.supabase.co', process.env.SUPABASE_KEY || 'placeholder');

fastify.get('/', async (request, reply) => {
  const { workspace_id } = request.query;
  let query = supabase.from('tickets').select('*');
  if (workspace_id) {
     query = query.eq('workspace_id', workspace_id);
  }
  const { data, error } = await query;
  if (error) return reply.code(500).send({ statusCode: 500, intOpCode: 'ExTK500', data: null });
  return { statusCode: 200, intOpCode: 'SxTK200', data };
});

fastify.get('/:id', async (request, reply) => {
  const { id } = request.params;
  const { data, error } = await supabase.from('tickets').select('*').eq('id', id).single();
  if (error) return reply.code(500).send({ statusCode: 500, intOpCode: 'ExTK500', data: null });
  return { statusCode: 200, intOpCode: 'SxTK200', data };
});

fastify.post('/', async (request, reply) => {
  const { title, description, priority, status, assigned_to, workspace_id, created_by } = request.body;
  const { data, error } = await supabase.from('tickets').insert([{ title, description, priority, status, assigned_to, workspace_id, created_by }]).select().single();
  
  if (error) return reply.code(500).send({ statusCode: 500, intOpCode: 'ExTK500', data: null });
  return { statusCode: 201, intOpCode: 'SxTK201', data };
});

fastify.patch('/:id', async (request, reply) => {
  const { id } = request.params;
  const body = request.body;
  const { data, error } = await supabase.from('tickets').update(body).eq('id', id).select().single();
  
  if (error) return reply.code(500).send({ statusCode: 500, intOpCode: 'ExTK500', data: null });
  return { statusCode: 200, intOpCode: 'SxTK200', data };
});

fastify.patch('/:id/status', async (request, reply) => {
  const { status } = request.body;
  const { id } = request.params;
  const { data, error } = await supabase.from('tickets').update({ status }).eq('id', id).select().single();
  
  if (error) return reply.code(500).send({ statusCode: 500, intOpCode: 'ExTK500', data: null });
  return { statusCode: 200, intOpCode: 'SxTK200', data };
});

fastify.delete('/:id', async (request, reply) => {
  const { id } = request.params;
  const { error } = await supabase.from('tickets').delete().eq('id', id);
  if (error) return reply.code(500).send({ statusCode: 500, intOpCode: 'ExTK500', data: null });
  return { statusCode: 200, intOpCode: 'SxTK200', data: { message: 'Ticket eliminado' } };
});

const start = async () => {
  try {
    const port = process.env.PORT || 3002;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`[Tickets Service] Escuchando en el puerto ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();