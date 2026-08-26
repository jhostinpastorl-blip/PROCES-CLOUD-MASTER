# Primer Super Admin PROCESA

No existe credencial hardcodeada.

Procedimiento seguro:
1. Crear el usuario en Supabase Auth.
2. Copiar su UUID de `auth.users.id`.
3. Insertarlo en `public.platform_admins` mediante SQL/migración controlada.
4. Confirmar que `/procesa-admin` permite acceso solo a ese usuario.
5. Confirmar que un Tenant Admin normal recibe acceso denegado.

Ejemplo SQL QA:
```sql
insert into public.platform_admins (user_id, is_active)
values ('<AUTH_USER_UUID>'::uuid, true)
on conflict (user_id) do update set is_active = excluded.is_active;
```

Nunca guardar email/password del admin en el repositorio.
