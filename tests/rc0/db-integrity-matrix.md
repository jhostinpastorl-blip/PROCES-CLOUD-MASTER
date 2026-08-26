# DB Integrity Matrix v0.36

1. misma persona + misma empresa no crea membership duplicada;
2. mismo membership + role no duplica binding;
3. mismo role + permission no duplica binding;
4. mismo código de sucursal dentro del tenant activo -> rechazado;
5. mismo código en tenant distinto -> permitido;
6. mismo nombre de rol dentro del tenant -> rechazado;
7. mismo nombre de rol en otro tenant -> permitido;
8. índices no rompen soft/suspend lifecycle.
