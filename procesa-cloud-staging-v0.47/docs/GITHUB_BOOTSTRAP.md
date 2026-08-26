# Bootstrap del repositorio oficial

## Objetivo
Convertir este paquete en el repositorio privado oficial `PROCESA-CLOUDE`.

## Primer import
```bash
git init
git branch -M main
git add .
git commit -m "chore: bootstrap PROCESA Cloud Core pre-RC0"
git remote add origin <REPO_PRIVADO>
git push -u origin main
```

Antes del push:
1. ejecutar `python scripts/secret_scan.py`;
2. confirmar `.env` ausente;
3. confirmar que `.env.example` contiene solo nombres/valores vacíos;
4. no copiar claves de Supabase al repositorio.

Después:
- habilitar protección de `main`;
- exigir CI;
- trabajar mediante ramas/PR.
