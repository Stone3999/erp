-- ESQUEMA DE ACTUALIZACIÓN (FIXED)
-- Ejecuta esto en Supabase

-- 1. Crear tabla de comentarios (Chat del Ticket)
CREATE TABLE IF NOT EXISTS ticket_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Añadir columna de fecha límite a los tickets
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS due_date DATE;

-- 3. Actualizar tabla de miembros (Solo añadir Rol y Fecha)
-- Mantenemos tu llave primaria compuesta actual
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Miembro';
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '["tickets:add", "tickets:move", "tickets:comment"]';

-- 4. Sincronizar creadores como administradores
-- Si el creador ya existe, le ponemos rol de Administrador
INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT id, created_by, 'Administrador' FROM workspaces
WHERE created_by IS NOT NULL
ON CONFLICT (workspace_id, user_id) 
DO UPDATE SET role = 'Administrador';
