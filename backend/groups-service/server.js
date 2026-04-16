import Fastify from 'fastify';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const fastify = Fastify({ logger: true });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const createGroupSchema = {
  body: {
    type: 'object',
    required: ['name', 'category', 'level', 'created_by'],
    properties: {
      name: { type: 'string', minLength: 3 },
      category: { type: 'string' },
      level: { type: 'string' },
      created_by: { type: 'string' },
      members: { type: 'array', items: { type: 'string' } }
    }
  }
};

const updateGroupSchema = {
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 3 },
      category: { type: 'string' },
      level: { type: 'string' },
      members: { type: 'array', items: { type: 'string' } },
      created_by: { type: 'string' }
    }
  }
};

const updateMembersSchema = {
  body: {
    type: 'object',
    required: ['members'],
    properties: {
      members: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
            role: { type: 'string' },
            permissions: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    }
  }
};

fastify.get('/', async (request, reply) => {
  try {
    const user_id = request.headers['x-user-id']; 
    const userName = request.headers['x-user-name'] || '';
    const permissionsRaw = request.headers['x-user-permissions'];
    const globalPermissions = permissionsRaw ? JSON.parse(permissionsRaw) : [];
    if (!user_id) return reply.code(400).send({ statusCode: 400, intOpCode: 'ExGR400', message: 'User ID missing' });

    const isSuperAdmin = globalPermissions.includes('admin:all');
    let workspaces;

    if (isSuperAdmin) {
      const { data, error } = await supabase.from('workspaces').select('*, users!created_by(name)');
      if (error) throw error;
      workspaces = data;
    } else {
      const { data: memberships, error: memError } = await supabase.from('workspace_members').select('workspace_id').eq('user_id', user_id);
      if (memError) throw memError;
      const workspaceIds = memberships.map(m => m.workspace_id);
      if (workspaceIds.length === 0) return { statusCode: 200, intOpCode: 'SxGR200', data: [] };
      const { data, error } = await supabase.from('workspaces').select('*, users!created_by(name)').in('id', workspaceIds);
      if (error) throw error;
      workspaces = data;
    }

    const enrichedWorkspaces = await Promise.all(workspaces.map(async (ws) => {
      const { data: tkStats } = await supabase.from('tickets').select('status, assigned_to').eq('workspace_id', ws.id);
      const stats = {
        total: tkStats?.length || 0,
        pendientes: tkStats?.filter(t => t.status === 'Pendiente').length || 0,
        activos: tkStats?.filter(t => t.status === 'En Progreso' || t.status === 'Revisión').length || 0,
        terminados: tkStats?.filter(t => t.status === 'Finalizado').length || 0,
        asignadosMi: tkStats?.filter(t => t.assigned_to === userName).length || 0
      };
      const { count: membersCount } = await supabase.from('workspace_members').select('*', { count: 'exact', head: true }).eq('workspace_id', ws.id);
      return { ...ws, creator_name: ws.users?.name || 'Sistema', stats, miembros: membersCount || 0, tickets: stats.total };
    }));
    return { statusCode: 200, intOpCode: 'SxGR200', data: enrichedWorkspaces };
  } catch (err) { return reply.code(500).send({ statusCode: 500, intOpCode: 'ExGR500', message: err.message }); }
});

fastify.patch('/:id', { schema: updateGroupSchema }, async (request, reply) => {
  try {
    const { id } = request.params;
    const { name, category, level, members, created_by } = request.body;
    const { data, error } = await supabase.from('workspaces').update({ name, category, level }).eq('id', id).select().single();
    if (error) throw error;
    if (members && members.length > 0) {
      await supabase.from('workspace_members').delete().eq('workspace_id', id);
      const membersToInsert = members.map((userId) => ({ workspace_id: id, user_id: userId }));
      if (created_by && !members.includes(created_by)) {
          membersToInsert.push({ workspace_id: id, user_id: created_by });
      }
      await supabase.from('workspace_members').insert(membersToInsert);
    }
    return { statusCode: 200, intOpCode: 'SxGR200', data };
  } catch (err) { return reply.code(500).send({ statusCode: 500, intOpCode: 'ExGR500', message: err.message }); }
});

fastify.get('/:id/members', async (request, reply) => {
  const { id } = request.params;
  const { data, error } = await supabase.from('workspace_members').select('user_id, role, permissions, users(name, email)').eq('workspace_id', id);
  if (error) return reply.code(500).send({ statusCode: 500, intOpCode: 'ExGR500', message: error.message });
  const members = data.map((m) => ({ id: m.user_id, name: m.users.name, email: m.users.email, role: m.role, permissions: m.permissions }));
  return { statusCode: 200, intOpCode: 'SxGR200', data: members };
});

fastify.get('/:id/my-permissions', async (request, reply) => {
  const { id } = request.params;
  const userId = request.headers['x-user-id'];
  if (!userId) return reply.code(400).send({ statusCode: 400, intOpCode: 'ExGR400', message: 'User ID missing' });
  const { data, error } = await supabase.from('workspace_members').select('permissions, role').eq('workspace_id', id).eq('user_id', userId).maybeSingle();
  if (error) return reply.code(500).send({ statusCode: 500, intOpCode: 'ExGR500', message: error.message });
  return { statusCode: 200, intOpCode: 'SxGR200', data: data ? data.permissions : [] };
});

fastify.put('/:id/members', { schema: updateMembersSchema }, async (request, reply) => {
  const { id } = request.params;
  const { members } = request.body;
  try {
    await supabase.from('workspace_members').delete().eq('workspace_id', id);
    const { error } = await supabase.from('workspace_members').insert(members.map(m => ({
        workspace_id: id,
        user_id: m.id,
        role: m.role || 'Miembro',
        permissions: m.permissions || ['tickets:add', 'tickets:move', 'tickets:comment']
    })));
    if (error) throw error;
    return { statusCode: 200, intOpCode: 'SxGR200', message: 'Miembros actualizados' };
  } catch (err) { return reply.code(500).send({ statusCode: 500, intOpCode: 'ExGR500', message: err.message }); }
});

fastify.post('/', { schema: createGroupSchema }, async (request, reply) => {
  try {
    const { name, category, level, created_by, members } = request.body;
    const { data: workspace, error: wsError } = await supabase.from('workspaces').insert([{ name, category, level, created_by }]).select().single();
    if (wsError) throw wsError;
    const membersToInsert = (members || []).map((userId) => ({
      workspace_id: workspace.id,
      user_id: userId,
      role: 'Miembro',
      permissions: ['tickets:add', 'tickets:move', 'tickets:comment']
    }));
    membersToInsert.push({ 
      workspace_id: workspace.id, 
      user_id: created_by,
      role: 'Administrador',
      permissions: ['tickets:add', 'tickets:move', 'tickets:delete', 'tickets:comment']
    });
    await supabase.from('workspace_members').insert(membersToInsert);
    return { statusCode: 201, intOpCode: 'SxGR201', data: workspace };
  } catch (err) { return reply.code(500).send({ statusCode: 500, intOpCode: 'ExGR500', message: err.message }); }
});

fastify.delete('/:id', async (request, reply) => {
  const { id } = request.params;
  await supabase.from('workspaces').delete().eq('id', id);
  return { statusCode: 200, intOpCode: 'SxGR200', message: 'Eliminado' };
});

const start = async () => {
  try {
    const port = 3003;
    await fastify.listen({ port, host: '0.0.0.0' });
  } catch (err) { process.exit(1); }
};
start();