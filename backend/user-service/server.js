import Fastify from 'fastify';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

const fastify = Fastify({ logger: true });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const JWT_SECRET = process.env.JWT_SECRET || 'super-secreto-para-jwt-local';

const registerSchema = {
  body: {
    type: 'object',
    required: ['email', 'password', 'name'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 6 },
      name: { type: 'string', minLength: 2 }
    }
  }
};

const loginSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string' }
    }
  }
};

const updateUserSchema = {
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 2 },
      email: { type: 'string', format: 'email' },
      permissions: { type: 'array', items: { type: 'string' } },
      is_active: { type: 'boolean' }
    }
  }
};

fastify.post('/auth/register', { schema: registerSchema }, async (request, reply) => {
  try {
    const { email, password, name } = request.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const { data, error } = await supabase.from('users').insert([{ email, password: hashedPassword, name, is_active: true }]).select().single();
    if (error) return reply.code(500).send({ statusCode: 500, intOpCode: 'ExUS500', message: error.message });
    return { statusCode: 201, intOpCode: 'SxUS201', data: { message: 'Usuario registrado' }};
  } catch (err) { return reply.code(500).send({ statusCode: 500, intOpCode: 'ExUS500', message: 'Error' }); }
});

fastify.post('/auth/login', { schema: loginSchema }, async (request, reply) => {
  const { email, password } = request.body;
  const { data: user, error } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
  
  if (!user) return reply.code(401).send({ statusCode: 401, intOpCode: 'ExUS401', message: 'Credenciales inválidas' });
  
  if (user.is_active === false) {
    return reply.code(403).send({ statusCode: 403, intOpCode: 'ExUS403', message: 'Tu cuenta está desactivada. Contacta al administrador.' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return reply.code(401).send({ statusCode: 401, intOpCode: 'ExUS401', message: 'Credenciales inválidas' });
  
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, permissions: user.permissions || [] }, JWT_SECRET, { expiresIn: '24h' });
  return { statusCode: 200, intOpCode: 'SxUS200', data: { token, user: { name: user.name, email: user.email, id: user.id, permissions: user.permissions || [] } }};
});

fastify.get('/auth/refresh', async (request, reply) => {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader) return reply.code(401).send({ statusCode: 401, message: 'No token' });
    
    const oldToken = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(oldToken, JWT_SECRET);
    
    const { data: user, error } = await supabase.from('users').select('id, email, name, permissions, is_active').eq('id', decoded.id).maybeSingle();
    
    if (!user || user.is_active === false) {
      return reply.code(403).send({ statusCode: 403, message: 'Usuario inactivo' });
    }

    const newToken = jwt.sign({ id: user.id, email: user.email, name: user.name, permissions: user.permissions || [] }, JWT_SECRET, { expiresIn: '24h' });
    return { statusCode: 200, intOpCode: 'SxUS200', data: { token: newToken } };
  } catch (err) {
    return reply.code(401).send({ statusCode: 401, message: 'Invalid token' });
  }
});

fastify.get('/', async (request, reply) => {
  const { data, error } = await supabase.from('users').select('id, email, name, permissions, is_active');
  if (error) return reply.code(500).send({ statusCode: 500, intOpCode: 'ExUS500', message: error.message });
  return { statusCode: 200, intOpCode: 'SxUS200', data };
});

fastify.patch('/:id', { schema: updateUserSchema }, async (request, reply) => {
  const { name, permissions, email, is_active } = request.body;
  const { id } = request.params;
  
  if (email) {
    const { data: existingUser } = await supabase.from('users').select('id').eq('email', email).neq('id', id).maybeSingle();
    if (existingUser) return reply.code(409).send({ statusCode: 409, intOpCode: 'ExUS409', message: 'El correo electrónico ya está registrado por otro usuario.' });
  }

  const updateData = {};
  if (name) updateData.name = name;
  if (email) updateData.email = email;
  if (permissions) updateData.permissions = permissions;
  if (typeof is_active === 'boolean') updateData.is_active = is_active;

  const { data, error } = await supabase.from('users').update(updateData).eq('id', id).select().single();
  if (error) return reply.code(500).send({ statusCode: 500, intOpCode: 'ExUS500', message: error.message });
  return { statusCode: 200, intOpCode: 'SxUS200', data };
});

fastify.delete('/:id', async (request, reply) => {
  try {
    const { id } = request.params;
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
    return { statusCode: 200, intOpCode: 'SxUS200', data: { message: 'Usuario eliminado correctamente' } };
  } catch (err) {
    return reply.code(500).send({ statusCode: 500, intOpCode: 'ExUS500', message: 'No se pudo eliminar el usuario' });
  }
});

fastify.patch('/:id/permissions', async (request, reply) => {
  const { permissions } = request.body;
  const { id } = request.params;
  const { data, error } = await supabase.from('users').update({ permissions }).eq('id', id).select().single();
  return { statusCode: 200, intOpCode: 'SxUS200', data };
});

const start = async () => {
  try {
    const port = 3001;
    await fastify.listen({ port, host: '0.0.0.0' });
  } catch (err) { process.exit(1); }
};
start();