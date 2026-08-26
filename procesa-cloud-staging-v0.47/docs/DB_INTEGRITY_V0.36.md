# DB Integrity v0.36

Nuevas garantías:
- membership único por company/user;
- membership_role único;
- role_permission único;
- código de sucursal único por tenant activo;
- nombre de rol único por tenant.

Estas restricciones reducen estados duplicados y carreras concurrentes.
Deben probarse contra Supabase QA antes de RC0.
