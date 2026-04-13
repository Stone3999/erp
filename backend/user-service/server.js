import Fastify from 'fastify';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

const fastify = Fastify({ logger: true });
const supabase = createClient(process.env.SUPABASE_URL || 'https://placeholder.supabase.co', process.env.SUPABASE_KEY || 'placeholder');
const JWT_SECRET = process.env.JWT_SECRET || 'super-secreto-para-jwt-local';

fastify.post('/auth/register', async (request, reply) => {
  const { email, password, name } = request.body;
  if (!email || !password || !name) {
      return reply.code(400).send({ statusCode: 400, intOpCode: 'ExUS400', data: { message: 'Faltan campos obligatorios' } });
  }

  const { data: existing } = await supabase.from('users').select('id').eq('email', email).single();
  if (existing) {
      return reply.code(400).send({ statusCode: 400, intOpCode: 'ExUS400', data: { message: 'El correo ya existe' }});
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const { data, error } = await supabase.from('users').insert([{ email, password: hashedPassword, name }]).select().single();
  if (error) return reply.code(500).send({ statusCode: 500, intOpCode: 'ExUS500', data: null });

  return { statusCode: 201, intOpCode: 'SxUS201', data: { message: 'Usuario registrado con éxito', user: data }};
});

fastify.post('/auth/login', async (request, reply) => {
  const { email, password } = request.body;
  const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();

  if (error || !user) {
     return reply.code(401).send({ statusCode: 401, intOpCode: 'ExUS401', data: null, message: 'Credenciales inválidas' });
  }

  // Permitimos texto plano temporalmente por si tienes cuentas viejas de pruebas
  let isMatch = false;
  if (user.password === password) {
      isMatch = true;
  } else {
      isMatch = await bcrypt.compare(password, user.password);
  }

  if (!isMatch) {
     return reply.code(401).send({ statusCode: 401, intOpCode: 'ExUS401', data: null, message: 'Credenciales inválidas' });
  }

  const token = jwt.sign({ 
    id: user.id, 
    email: user.email, 
    name: user.name, 
    permissions: user.permissions 
  }, JWT_SECRET, { expiresIn: '24h' });

  return { statusCode: 200, intOpCode: 'SxUS200', data: { token, user: { name: user.name, email: user.email, id: user.id, permissions: user.permissions } }};
});

fastify.get('/users', async (request, reply) => {
  const { data, error } = await supabase.from('users').select('id, email, name, permissions');
  if (error) return reply.code(500).send({ statusCode: 500, intOpCode: 'ExUS500', data: null });
  return { statusCode: 200, intOpCode: 'SxUS200', data };
});

fastify.patch('/users/:id/permissions', async (request, reply) => {
  const { permissions } = request.body;
  const { id } = request.params;
  const { data, error } = await supabase.from('users').update({ permissions }).eq('id', id).select('id, email, name, permissions').single();
  
  if (error) return reply.code(500).send({ statusCode: 500, intOpCode: 'ExUS500', data: null });
  return { statusCode: 200, intOpCode: 'SxUS200', data };
});

const start = async () => {
  try {
    const port = process.env.PORT || 3001;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`[User Service] Escuchando en el puerto ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();