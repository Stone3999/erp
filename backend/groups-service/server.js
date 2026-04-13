import Fastify from 'fastify';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const fastify = Fastify({ logger: true });
const supabase = createClient(process.env.SUPABASE_URL || 'https://placeholder.supabase.co', process.env.SUPABASE_KEY || 'placeholder');

fastify.get('/', async (request, reply) => {
  const { data, error } = await supabase.from('workspaces').select('*');
  if (error) return reply.code(500).send({ statusCode: 500, intOpCode: 'ExGR500', data: null });
  return { statusCode: 200, intOpCode: 'SxGR200', data };
});

fastify.post('/', async (request, reply) => {
  const { name, category, level, created_by } = request.body;
  const { data, error } = await supabase.from('workspaces').insert([{ name, category, level, created_by }]).select().single();
  
  if (error) return reply.code(500).send({ statusCode: 500, intOpCode: 'ExGR500', data: null });
  return { statusCode: 201, intOpCode: 'SxGR201', data };
});

fastify.patch('/:id', async (request, reply) => {
  const { id } = request.params;
  const body = request.body;
  const { data, error } = await supabase.from('workspaces').update(body).eq('id', id).select().single();
  
  if (error) return reply.code(500).send({ statusCode: 500, intOpCode: 'ExGR500', data: null });
  return { statusCode: 200, intOpCode: 'SxGR200', data };
});

fastify.delete('/:id', async (request, reply) => {
  const { id } = request.params;
  const { error } = await supabase.from('workspaces').delete().eq('id', id);
  if (error) return reply.code(500).send({ statusCode: 500, intOpCode: 'ExGR500', data: null });
  return { statusCode: 200, intOpCode: 'SxGR200', data: { message: 'Workspace eliminado' } };
});

const start = async () => {
  try {
    const port = process.env.PORT || 3003;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`[Groups Service] Escuchando en el puerto ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();