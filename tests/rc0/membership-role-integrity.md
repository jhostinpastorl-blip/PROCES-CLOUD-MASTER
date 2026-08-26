# Membership / Role Integrity Matrix

PASS requerido:
1. membership de Empresa A + role de Empresa A -> permitido si autorizado.
2. membership A + role B -> rechazo DB.
3. membership suspendida -> is_company_member=false.
4. membership removed -> is_company_member=false.
5. membership active -> is_company_member=true.
6. asignación directa a membership_roles no puede cruzar tenant.
7. cambio de role_id mediante UPDATE tampoco puede cruzar tenant.
8. Super Admin de plataforma sin membership no se considera tenant member.
