import Fastify from 'fastify';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const fastify = Fastify({ logger: true });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

fastify.get('/', async (request, reply) => {
  try {
    const { data, error } = await supabase.from('workspaces').select('*');
    if (error) throw error;
    return { statusCode: 200, data };
  } catch (err) {
    console.error('[Groups GET Error]:', err);
    return reply.code(500).send({ statusCode: 500, message: 'Error al obtener grupos' });
  }
});

fastify.post('/', async (request, reply) => {
  try {
    const { name, category, level, created_by } = request.body;
    console.log('[Groups POST] Recibido:', { name, category, level, created_by });

    if (!name) {
      return reply.code(400).send({ statusCode: 400, message: 'El nombre es obligatorio' });
    }

    // Insertamos en la tabla 'workspaces' (que es la que está en tu SQL)
    const { data, error } = await supabase
      .from('workspaces')
      .insert([{ 
        name, 
        category: category || 'General', 
        level: level || 'Básico',
        created_by: created_by || null // Si falla, puede ser por el FK del usuario
      }])
      .select()
      .single();
    
    if (error) {
      console.error('[Supabase Groups Insert Error]:', error);
      return reply.code(500).send({ statusCode: 500, message: error.message });
    }

    console.log('[Groups POST] Éxito:', data);
    return { statusCode: 201, intOpCode: 'SxGR201', data };
  } catch (err) {
    console.error('[Groups POST Catch]:', err);
    return reply.code(500).send({ statusCode: 500, message: 'Error interno' });
  }
});

fastify.patch('/:id', async (request, reply) => {
  const { id } = request.params;
  const { data, error } = await supabase.from('workspaces').update(request.body).eq('id', id).select().single();
  if (error) return reply.code(500).send({ statusCode: 500, message: error.message });
  return { statusCode: 200, data };
});

fastify.delete('/:id', async (request, reply) => {
  const { id } = request.params;
  const { error } = await supabase.from('workspaces').delete().eq('id', id);
  if (error) return reply.code(500).send({ statusCode: 500, message: error.message });
  return { statusCode: 200, data: { message: 'Eliminado' } };
});

const start = async () => {
  try {
    const port = 3003;
    await fastify.listen({ port, host: '0.0.0.0' });
  } catch (err) {
    process.exit(1);
  }
};
start();