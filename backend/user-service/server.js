import Fastify from 'fastify';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

const fastify = Fastify({ logger: true });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const JWT_SECRET = process.env.JWT_SECRET || 'super-secreto-para-jwt-local';

// Registro y Login se mantienen igual...
fastify.post('/auth/register', async (request, reply) => {
  try {
    const { email, password, name } = request.body;
    if (!email || !password || !name) return reply.code(400).send({ statusCode: 400, message: 'Faltan campos' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const { data, error } = await supabase.from('users').insert([{ email, password: hashedPassword, name }]).select().single();
    if (error) return reply.code(500).send({ statusCode: 500, message: error.message });
    return { statusCode: 201, intOpCode: 'SxUS201', data: { message: 'Usuario registrado' }};
  } catch (err) { return reply.code(500).send({ statusCode: 500, message: 'Error' }); }
});

fastify.post('/auth/login', async (request, reply) => {
  const { email, password } = request.body;
  const { data: user, error } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
  if (!user) return reply.code(401).send({ statusCode: 401, message: 'Inexistente' });
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return reply.code(401).send({ statusCode: 401, message: 'Incorrecto' });
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, permissions: user.permissions }, JWT_SECRET, { expiresIn: '24h' });
  return { statusCode: 200, data: { token, user: { name: user.name, email: user.email, id: user.id, permissions: user.permissions } }};
});

// FIX: Cambiamos /users a / para que coincida con el proxy de la Gateway
fastify.get('/', async (request, reply) => {
  const { data, error } = await supabase.from('users').select('id, email, name, permissions');
  if (error) return reply.code(500).send({ statusCode: 500, message: error.message });
  return { statusCode: 200, data };
});

fastify.patch('/:id', async (request, reply) => {
  const { name, permissions, email } = request.body;
  const { id } = request.params;
  const updateData = {};
  if (name) updateData.name = name;
  if (email) updateData.email = email;
  if (permissions) updateData.permissions = permissions;

  const { data, error } = await supabase.from('users').update(updateData).eq('id', id).select().single();
  if (error) return reply.code(500).send({ statusCode: 500, message: error.message });
  return { statusCode: 200, data };
});

fastify.patch('/:id/permissions', async (request, reply) => {
  const { permissions } = request.body;
  const { id } = request.params;
  const { data, error } = await supabase.from('users').update({ permissions }).eq('id', id).select().single();
  return { statusCode: 200, data };
});

const start = async () => {
  try {
    const port = 3001;
    await fastify.listen({ port, host: '0.0.0.0' });
  } catch (err) { process.exit(1); }
};
start();