-- ESQUEMA COMPLETO PARA SUPABASE
-- ERP ROOMS4UMS

-- 1. Usuarios
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  permissions JSONB DEFAULT '["view:dashboard", "tickets:add", "tickets:move", "tickets:comment"]'
);

-- 2. Workspaces (Rooms)
CREATE TABLE workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  level TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 3. Miembros del Workspace (Relación muchos a muchos)
CREATE TABLE workspace_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'Miembro',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- 4. Tickets
CREATE TABLE tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'Pendiente',
  priority TEXT DEFAULT 'Media',
  assigned_to TEXT, -- Guardamos el nombre del usuario asignado
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date DATE
);

-- 5. Comentarios de Tickets (Chat persistente)
CREATE TABLE ticket_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Logs de Auditoría (Puntos Extra)
CREATE TABLE logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT,
  method TEXT,
  user_email TEXT,
  ip TEXT,
  status_code INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Métricas de Rendimiento (Puntos Extra)
CREATE TABLE metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- DATOS INICIALES
-- Insertar Admin Jefe (Password: Admin@12345 - Hasheada con bcrypt en producción)
-- Nota: Para que el login funcione la primera vez, el user-service debe manejar el hash.
-- Si insertas esto manual, recuerda que el sistema usa bcrypt para comparar.
INSERT INTO users (email, password, name, permissions) 
VALUES ('admin@miapp.com', '$2b$10$px.skMTX9.YRyidX.ZOfyeXWv.vQYvXWv.vQYvXWv.vQYvXWv.vQY', 'Admin Jefe', '["tickets:add", "tickets:move", "tickets:edit_all", "tickets:delete", "tickets:comment", "view:dashboard", "users:manage", "groups:manage"]');
