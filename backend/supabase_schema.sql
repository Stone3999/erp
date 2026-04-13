-- EJECUTA ESTO EN EL SQL EDITOR DE SUPABASE PARA CREAR LAS TABLAS

CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  permissions JSONB DEFAULT '["view:dashboard", "tickets:add", "tickets:move", "tickets:comment"]'
);

CREATE TABLE workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  level TEXT,
  created_by UUID REFERENCES users(id)
);

CREATE TABLE tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'Pendiente',
  priority TEXT DEFAULT 'Media',
  assigned_to TEXT, -- Guardamos el nombre o correo temporalmente
  workspace_id UUID REFERENCES workspaces(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLAS PARA LOS PUNTOS EXTRA DEL PROFESOR (20% + 20%)
CREATE TABLE logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT,
  method TEXT,
  user_email TEXT,
  ip TEXT,
  status_code INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar el Admin inicial (La contraseña es "Admin@12345" en texto plano para la práctica)
INSERT INTO users (email, password, name, permissions) 
VALUES ('admin@miapp.com', 'Admin@12345', 'Admin Jefe', '["tickets:add", "tickets:move", "tickets:edit_all", "tickets:delete", "tickets:comment", "view:dashboard", "users:manage", "groups:manage"]');
