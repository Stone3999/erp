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


fastify.addHook('onRequest', async (request, reply) => {
  request.startTime = Date.now();
});

fastify.addHook('onResponse', async (request, reply) => {
  const responseTime = Date.now() - request.startTime;
  
  
  supabase.from('logs').insert([{
    endpoint: request.url,
    method: request.method,
    user_email: request.user?.email || 'anonimo',
    ip: request.ip,
    status_code: reply.statusCode,
  }]).then();

  
  supabase.from('metrics').insert([{
    endpoint: request.url,
    response_time_ms: responseTime
  }]).then();
});


fastify.addHook('onError', async (request, reply, error) => {
  console.error('[Gateway Error Trace]:', error);
  
  supabase.from('logs').insert([{
    endpoint: request.url,
    method: request.method,
    user_email: request.user?.email || 'error_hook',
    ip: request.ip,
    status_code: reply.statusCode || 500,
    error_stack: error.stack 
  }]).then();
});


fastify.addHook('preHandler', async (request, reply) => {
  const path = request.url;
  
  
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
    request.user = decoded; 
    
    
    const { data: currentUser, error: userError } = await supabase
        .from('users')
        .select('is_active')
        .eq('id', decoded.id)
        .maybeSingle();
    
    if (userError || (currentUser && currentUser.is_active === false)) {
        return reply.code(403).send({ statusCode: 403, intOpCode: 'ExUS403', data: null, message: 'Usuario inactivo' });
    }

    request.headers['x-user-id'] = decoded.id;
    request.headers['x-user-name'] = decoded.name;
    request.headers['x-user-email'] = decoded.email;
    request.headers['x-user-permissions'] = JSON.stringify(decoded.permissions || []);

    const method = request.method;
    let requiredPerm = null;

    
    if (path.startsWith('/tickets')) {
      if (method === 'POST') requiredPerm = 'tickets:add';
      if (method === 'PATCH' || method === 'PUT') requiredPerm = 'tickets:move';
      if (method === 'DELETE') requiredPerm = 'tickets:delete';
    } else if (path.startsWith('/groups')) {
      if (method === 'POST' || method === 'DELETE' || method === 'PUT') requiredPerm = 'groups:manage';
    } else if (path.startsWith('/users')) {
       if (method !== 'GET') requiredPerm = 'users:manage';
    }

    if (path === '/dashboard' || path === '/dashboard/') {
        requiredPerm = 'view:dashboard';
    }

    if (!requiredPerm) return;

    
    const hasGlobalPerm = decoded.permissions && decoded.permissions.includes(requiredPerm);
    const isSuperAdmin = decoded.permissions && (decoded.permissions.includes('admin:all') || decoded.permissions.includes('tickets:edit_all'));

    if (isSuperAdmin) return; 

    
    let workspaceId = request.body?.workspace_id || request.query?.workspace_id;
    
    
    if (!workspaceId && path.startsWith('/tickets/')) {
        const ticketId = path.split('/')[2]?.split('?')[0];
        if (ticketId && ticketId.length > 30) { 
            const { data: ticket } = await supabase.from('tickets').select('workspace_id, assigned_to_id').eq('id', ticketId).single();
            workspaceId = ticket?.workspace_id;

            
            if (requiredPerm === 'tickets:move') {
                const canMoveAll = member?.permissions?.includes('tickets:moveall') || decoded.permissions?.includes('tickets:moveall') || decoded.permissions?.includes('admin:all');
                
                if (!canMoveAll && ticket && ticket.assigned_to_id !== decoded.id) {
                     return reply.code(403).send({ statusCode: 403, intOpCode: 'ExUS403', message: 'Forbidden: Este ticket no te pertenece y no tienes tickets:moveall.' });
                }
            }
        }
    }

    if (workspaceId) {
        
        const { data: member } = await supabase
            .from('workspace_members')
            .select('permissions')
            .eq('workspace_id', workspaceId)
            .eq('user_id', decoded.id)
            .single();
        
        const hasLocalPerm = member?.permissions && member.permissions.includes(requiredPerm);
        
        if (hasLocalPerm || hasGlobalPerm) {
            return; 
        } else {
            return reply.code(403).send({ 
                statusCode: 403, 
                intOpCode: 'ExUS403', 
                message: `Forbidden: No tienes el permiso [${requiredPerm}] en este Workspace.` 
            });
        }
    }

    
    if (!hasGlobalPerm) {
       return reply.code(403).send({ 
           statusCode: 403, 
           intOpCode: 'ExUS403', 
           message: `Forbidden: No tienes el permiso global [${requiredPerm}].` 
       });
    }

  } catch (err) {
    console.error('[Gateway Auth Error]:', err);
    return reply.code(401).send({ statusCode: 401, intOpCode: 'ExUS401', data: null, message: 'Invalid token' });
  }
});


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