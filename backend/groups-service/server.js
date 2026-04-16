import Fastify from 'fastify';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const fastify = Fastify({ logger: true });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

fastify.get('/', async (request, reply) => {
  try {
    const user_id = request.headers['x-user-id']; 
    const userName = request.headers['x-user-name'] || '';
    const permissionsRaw = request.headers['x-user-permissions'];
    const globalPermissions = permissionsRaw ? JSON.parse(permissionsRaw) : [];

    if (!user_id) return reply.code(400).send({ statusCode: 400, message: 'User ID missing' });

    const isSuperAdmin = globalPermissions.includes('admin:all');
    let workspaces;

    if (isSuperAdmin) {
      // SUPER ADMIN: Ve todo el sistema
      const { data, error } = await supabase
        .from('workspaces')
        .select('*, users!created_by(name)');
      if (error) throw error;
      workspaces = data;
    } else {
      // USUARIO NORMAL: Solo donde es miembro
      const { data: memberships, error: memError } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user_id);

      if (memError) throw memError;
      const workspaceIds = memberships.map(m => m.workspace_id);

      if (workspaceIds.length === 0) return { statusCode: 200, data: [] };

      const { data, error } = await supabase
        .from('workspaces')
        .select('*, users!created_by(name)')
        .in('id', workspaceIds);
      if (error) throw error;
      workspaces = data;
    }

    const enrichedWorkspaces = await Promise.all(workspaces.map(async (ws) => {
      // Conteos detallados
      const { data: tkStats } = await supabase.from('tickets').select('status, assigned_to').eq('workspace_id', ws.id);
      
      const stats = {
        total: tkStats?.length || 0,
        pendientes: tkStats?.filter(t => t.status === 'Pendiente').length || 0,
        activos: tkStats?.filter(t => t.status === 'En Progreso' || t.status === 'Revisión').length || 0,
        terminados: tkStats?.filter(t => t.status === 'Finalizado').length || 0,
        asignadosMi: tkStats?.filter(t => t.assigned_to === userName).length || 0
      };

      const { count: membersCount } = await supabase
        .from('workspace_members')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', ws.id);

      return {
        ...ws,
        creator_name: ws.users?.name || 'Sistema',
        stats,
        miembros: membersCount || 0,
        tickets: stats.total
      };
    }));

    return { statusCode: 200, data: enrichedWorkspaces };
  } catch (err) {
    return reply.code(500).send({ statusCode: 500, message: err.message });
  }
});

// NUEVA RUTA: PATCH para actualizar grupos y miembros
fastify.patch('/:id', async (request, reply) => {
  try {
    const { id } = request.params;
    const { name, category, level, members, created_by } = request.body;
    
    // 1. Actualizar datos básicos del Workspace
    const { data, error } = await supabase
      .from('workspaces')
      .update({ name, category, level })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // 2. Si se envían miembros, sincronizar la tabla workspace_members
    if (members && members.length > 0) {
      // Borramos miembros actuales
      await supabase.from('workspace_members').delete().eq('workspace_id', id);

      // Insertamos la nueva lista
      const membersToInsert = members.map((userId) => ({
        workspace_id: id,
        user_id: userId
      }));

      // Nos aseguramos de que el creador (o quien edita) siga siendo miembro/admin
      if (created_by && !members.includes(created_by)) {
          membersToInsert.push({ workspace_id: id, user_id: created_by });
      }

      await supabase.from('workspace_members').insert(membersToInsert);
    }

    return { statusCode: 200, data };
  } catch (err) {
    return reply.code(500).send({ statusCode: 500, message: err.message });
  }
});

// NUEVA RUTA PARA OBTENER MIEMBROS DE UN GRUPO
fastify.get('/:id/members', async (request, reply) => {
  const { id } = request.params;
  const { data, error } = await supabase
    .from('workspace_members')
    .select('user_id, role, permissions, users(name, email)')
    .eq('workspace_id', id);
  
  if (error) return reply.code(500).send({ statusCode: 500, message: error.message });
  
  const members = data.map((m) => ({
    id: m.user_id,
    name: m.users.name,
    email: m.users.email,
    role: m.role,
    permissions: m.permissions
  }));
  
  return { statusCode: 200, data: members };
});

// NUEVA RUTA: Obtener mis permisos específicos en este grupo
fastify.get('/:id/my-permissions', async (request, reply) => {
  const { id } = request.params;
  const userId = request.headers['x-user-id'];

  if (!userId) return reply.code(400).send({ statusCode: 400, message: 'User ID missing' });

  const { data, error } = await supabase
    .from('workspace_members')
    .select('permissions, role')
    .eq('workspace_id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return reply.code(500).send({ statusCode: 500, message: error.message });
  
  return { 
    statusCode: 200, 
    data: data ? data.permissions : [] 
  };
});

// NUEVA RUTA: Actualizar miembros (incluyendo sus permisos)
fastify.put('/:id/members', async (request, reply) => {
  const { id } = request.params;
  const { members } = request.body; // Expects array of { user_id, role, permissions }

  try {
    // 1. Borrar miembros actuales
    await supabase.from('workspace_members').delete().eq('workspace_id', id);

    // 2. Insertar nuevos miembros con sus permisos
    const { error } = await supabase.from('workspace_members').insert(
      members.map(m => ({
        workspace_id: id,
        user_id: m.id,
        role: m.role || 'Miembro',
        permissions: m.permissions || ['tickets:add', 'tickets:move', 'tickets:comment']
      }))
    );

    if (error) throw error;
    return { statusCode: 200, message: 'Miembros actualizados' };
  } catch (err) {
    return reply.code(500).send({ statusCode: 500, message: err.message });
  }
});

fastify.post('/', async (request, reply) => {
  try {
    const { name, category, level, created_by, members } = request.body;
    
    // 1. Crear el Workspace
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .insert([{ name, category, level, created_by }])
      .select()
      .single();
    
    if (wsError) throw wsError;

    // 2. Preparar miembros (incluyendo al creador como Admin Pro)
    const membersToInsert = (members || []).map((userId) => ({
      workspace_id: workspace.id,
      user_id: userId,
      role: 'Miembro',
      permissions: ['tickets:add', 'tickets:move', 'tickets:comment']
    }));
    
    // Agregar al creador como Administrador con TODO
    membersToInsert.push({ 
      workspace_id: workspace.id, 
      user_id: created_by,
      role: 'Administrador',
      permissions: ['tickets:add', 'tickets:move', 'tickets:delete', 'tickets:comment']
    });

    await supabase.from('workspace_members').insert(membersToInsert);

    return { statusCode: 201, data: workspace };
  } catch (err) {
    return reply.code(500).send({ statusCode: 500, message: err.message });
  }
});

fastify.delete('/:id', async (request, reply) => {
  const { id } = request.params;
  await supabase.from('workspaces').delete().eq('id', id);
  return { statusCode: 200, message: 'Eliminado' };
});

const start = async () => {
  try {
    const port = 3003;
    await fastify.listen({ port, host: '0.0.0.0' });
  } catch (err) { process.exit(1); }
};
start();