import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import proxy from '@fastify/http-proxy';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const fastify = Fastify({ logger: true });

const supabase = createClient(process.env.SUPABASE_URL || 'https://tu-proyecto.supabase.co', process.env.SUPABASE_KEY || 'tu-anon-key');
const JWT_SECRET = process.env.JWT_SECRET || 'super-secreto-para-jwt-local';

await fastify.register(cors, { origin: '*' });

// --- REQUERIMIENTO: Rate Limiting ---
await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  errorResponseBuilder: function (request, context) {
    return {
      statusCode: 429,
      intOpCode: 'ExUS429',
      data: null,
      message: 'Too many requests'
    }
  }
});

// --- REQUERIMIENTO EXTRA (20% + 20%): Logs y Métricas centralizadas ---
fastify.addHook('onRequest', async (request, reply) => {
  request.startTime = Date.now();
});

fastify.addHook('onResponse', async (request, reply) => {
  const responseTime = Date.now() - request.startTime;
  
  // Guardar log en Supabase (de forma asíncrona para no bloquear)
  supabase.from('logs').insert([{
    endpoint: request.url,
    method: request.method,
    user_email: request.user?.email || 'anonimo',
    ip: request.ip,
    status_code: reply.statusCode,
  }]).then();

  // Guardar métrica en Supabase
  supabase.from('metrics').insert([{
    endpoint: request.url,
    response_time_ms: responseTime
  }]).then();
});

// --- REQUERIMIENTO: Validación de Token y Permisos en API Gateway ---
fastify.addHook('preHandler', async (request, reply) => {
  const path = request.url;
  
  // Rutas públicas
  if (path.startsWith('/auth/login') || path.startsWith('/auth/register')) {
    return;
  }

  const authHeader = request.headers.authorization;
  if (!authHeader) {
    return reply.code(401).send({ statusCode: 401, intOpCode: 'ExUS401', data: null, message: 'Token missing' });
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    request.user = decoded; // { id, email, permissions }
    
    // Verificación fina de permisos por método (Como pide el TXT)
    const method = request.method;
    let requiredPerm = null;

    if (path.startsWith('/tickets')) {
      if (method === 'POST') requiredPerm = 'tickets:add';
      if (method === 'PATCH' || method === 'PUT') requiredPerm = 'tickets:move';
      if (method === 'DELETE') requiredPerm = 'tickets:delete';
    } else if (path.startsWith('/groups')) {
      if (method === 'POST' || method === 'DELETE' || method === 'PUT') requiredPerm = 'groups:manage';
    } else if (path.startsWith('/users')) {
       // GET es público para usuarios logueados, otros métodos requieren users:manage
       if (method !== 'GET') requiredPerm = 'users:manage';
    }

    if (requiredPerm && !decoded.permissions.includes(requiredPerm)) {
       return reply.code(403).send({ statusCode: 403, intOpCode: 'ExUS403', data: null, message: 'Forbidden: Falta permiso ' + requiredPerm });
    }

  } catch (err) {
    return reply.code(401).send({ statusCode: 401, intOpCode: 'ExUS401', data: null, message: 'Invalid token' });
  }
});

// --- REQUERIMIENTO: Enrutamiento a Microservicios ---
fastify.register(proxy, {
  upstream: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  prefix: '/auth',
  rewritePrefix: '/auth'
});

fastify.register(proxy, {
  upstream: process.env.TICKETS_SERVICE_URL || 'http://localhost:3002',
  prefix: '/tickets',
  rewritePrefix: ''
});

fastify.register(proxy, {
  upstream: process.env.GROUPS_SERVICE_URL || 'http://localhost:3003',
  prefix: '/groups',
  rewritePrefix: ''
});

fastify.register(proxy, {
  upstream: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  prefix: '/users',
  rewritePrefix: ''
});

const start = async () => {
  try {
    const port = process.env.PORT || 3000;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`[API Gateway] Escuchando en el puerto ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();