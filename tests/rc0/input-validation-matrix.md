# Input Validation Matrix v0.36

PASS requerido:
1. emails se normalizan a minúsculas;
2. passwords <10 chars rechazados;
3. companyId no UUID rechazado;
4. branch code con caracteres fuera de `[A-Za-z0-9_-]` rechazado;
5. currency != 3 chars rechazada;
6. roleId inválido rechazado antes de RPC;
7. payloads extra no cambian company_id autorizado;
8. errores Zod no exponen stack/SQL al usuario;
9. backend vuelve a validar aunque frontend tenga `required`;
10. inputs no cambian tenant por manipulación del DOM.
