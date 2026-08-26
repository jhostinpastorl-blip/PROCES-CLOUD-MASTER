-- Migration 050: Purge obsolete non-catalog permissions to align remote DB with 16 official Core permissions.
delete from public.role_permissions
where permission_id in (select id from public.permissions where code = 'notifications.manage');

delete from public.permissions
where code = 'notifications.manage';
