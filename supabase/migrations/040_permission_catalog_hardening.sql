-- Catálogo mínimo Core, extensible y sin depender de nombres de roles.
insert into public.permissions(code,description) values
('branches.read','Ver sucursales'),
('branches.manage','Administrar sucursales'),
('users.read','Ver usuarios y membresías'),
('users.invite','Invitar, suspender o retirar usuarios'),
('roles.read','Ver roles y permisos'),
('roles.manage','Administrar roles y permisos'),
('modules.read','Ver módulos'),
('modules.manage','Administrar módulos'),
('company.read','Ver configuración de empresa'),
('company.update','Actualizar configuración de empresa'),
('subscription.read','Ver plan y capacidad'),
('subscription.manage','Administrar cambios de suscripción'),
('storage.read','Ver archivos'),
('storage.manage','Administrar archivos'),
('audit.read','Ver auditoría'),
('notifications.read','Ver notificaciones')
on conflict(code) do update set description=excluded.description;
