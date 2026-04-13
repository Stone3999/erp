import Fastify from 'fastify';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

const fastify = Fastify({ logger: true });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const JWT_SECRET = process.env.JWT_SECRET || 'super-secreto-para-jwt-local';

fastify.post('/auth/register', async (request, reply) => {
  try {
    const { email, password, name } = request.body;
    console.log(`[Register] Intentando registrar a: ${email}`);

    if (!email || !password || !name) {
        return reply.code(400).send({ statusCode: 400, intOpCode: 'ExUS400', message: 'Faltan campos' });
    }

    // Buscamos si existe (usamos maybeSingle para evitar error de 0 filas)
    const { data: existing, error: searchError } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
    
    if (searchError) {
        console.error('[Supabase Search Error]:', searchError);
        throw searchError;
    }

    if (existing) {
        return reply.code(400).send({ statusCode: 400, intOpCode: 'ExUS400', message: 'El correo ya existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const { data, error } = await supabase.from('users').insert([{ email, password: hashedPassword, name }]).select().single();
    
    if (error) {
        console.error('[Supabase Insert Error]:', error);
        return reply.code(500).send({ statusCode: 500, intOpCode: 'ExUS500', message: error.message });
    }

    return { statusCode: 201, intOpCode: 'SxUS201', data: { message: 'Usuario registrado con éxito' }};
  } catch (err) {
    console.error('[Register Catch]:', err);
    return reply.code(500).send({ statusCode: 500, message: 'Error interno del servidor' });
  }
});

fastify.post('/auth/login', async (request, reply) => {
  try {
    const { email, password } = request.body;
    console.log(`[Login] Intento de entrada: ${email}`);

    const { data: user, error } = await supabase.from('users').select('*').eq('email', email).maybeSingle();

    if (error) {
        console.error('[Supabase Login Search Error]:', error);
        return reply.code(500).send({ statusCode: 500, message: 'Error de base de datos' });
    }

    if (!user) {
       console.log('[Login] Usuario no encontrado');
       return reply.code(401).send({ statusCode: 401, message: 'Credenciales inválidas' });
    }

    let isMatch = false;
    if (user.password === password) {
        isMatch = true;
    } else {
        isMatch = await bcrypt.compare(password, user.password);
    }

    if (!isMatch) {
       console.log('[Login] Contraseña incorrecta');
       return reply.code(401).send({ statusCode: 401, message: 'Credenciales inválidas' });
    }

    const token = jwt.sign({ 
      id: user.id, 
      email: user.email, 
      name: user.name, 
      permissions: user.permissions 
    }, JWT_SECRET, { expiresIn: '24h' });

    console.log('[Login] Éxito');
    return { statusCode: 200, intOpCode: 'SxUS200', data: { token, user: { name: user.name, email: user.email, id: user.id, permissions: user.permissions } }};
  } catch (err) {
    console.error('[Login Catch]:', err);
    return reply.code(500).send({ statusCode: 500, message: 'Error interno' });
  }
});

fastify.get('/users', async (request, reply) => {
  const { data, error } = await supabase.from('users').select('id, email, name, permissions');
  return { statusCode: 200, data };
});

const start = async () => {
  try {
    const port = 3001;
    await fastify.listen({ port, host: '0.0.0.0' });
  } catch (err) {
    process.exit(1);
  }
};
start();