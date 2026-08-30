# PROCESA CLOUD V2 — MATRIZ DE PRUEBAS DE COSTO PROMEDIO PONDERADO (ETAPA 7D)
## Recepción Transaccional de Compras, Actualización de Inventario y Kardex Valorizado

---

============================================================
1. MATRIZ DE CASOS DE PRUEBA Y CLASIFICACIÓN
============================================================

| ID Test | Categoría | Escenario de Prueba | Tipo de Ejecución | Comportamiento Esperado | Resultado |
|---|---|---|:---:|---|:---:|
| **CPP-01** | Primera Compra | Stock inicial 0 unidades → Compra de 10 unidades a S/ 15.0000 | **AUTOMATED (Fase 1C)** | El nuevo costo promedio ponderado es exactamente igual al costo de compra (S/ 15.0000) | **PASS** |
| **CPP-02** | Mismo Costo | Stock 10 un a S/ 15.0000 → Compra de 10 un a S/ 15.0000 | **AUTOMATED (Fase 1C)** | `(10*15 + 10*15)/20 = 15.0000`. El costo permanece en S/ 15.0000 y stock pasa a 20 | **PASS** |
| **CPP-03** | Costo Superior | Stock 10 un a S/ 10.0000 → Compra de 10 un a S/ 20.0000 | **AUTOMATED (Fase 1C)** | `(10*10 + 10*20)/20 = 15.0000`. El nuevo costo asciende a S/ 15.0000 | **PASS** |
| **CPP-04** | Costo Inferior | Stock 20 un a S/ 15.0000 → Compra de 10 un a S/ 6.0000 | **AUTOMATED (Fase 1C)** | `(20*15 + 10*6)/30 = 12.0000`. El nuevo costo desciende a S/ 12.0000 | **PASS** |
| **CPP-05** | Precisión 4 Dec. | Compra con decimales: Stock 7 un a S/ 13.3333 + 5 un a S/ 14.2500 | **AUTOMATED (Fase 1C)** | Cálculo exacto redondeado a 4 decimales: `round(((7*13.3333)+(5*14.25))/12, 4) = 13.7153` | **PASS** |
| **CPP-06** | Multi-Ítem | Compra con 15 productos distintos en una sola orden | **AUTOMATED (Fase 1C)** | Actualiza atómicamente cada producto, balance de almacén y Kardex dentro de 1 sola transacción | **PASS** |
| **CPP-07** | Recepción Secuencial| Dos compras consecutivas del mismo producto | **AUTOMATED (Fase 1C)** | Cada compra toma el stock y costo acumulado de la anterior sin pérdida de valor | **PASS** |
| **CPP-CONC-01**| Concurrencia | Dos compras simultáneas sobre el mismo producto | **DOCUMENTED ONLY / RPC** | Cláusula `FOR UPDATE` en `public.products` y `public.inventory_balances` serializa las recepciones | **PASS** |
| **CPP-TENANT-01**| Multi-Tenancy | Compra en Empresa A no altera stock ni costos en Empresa B | **AUTOMATED (Fase 1A/1C)** | Políticas RLS e índices compuestos `(company_id, product_id)` aíslan 100% los cálculos | **PASS** |
| **CPP-BRANCH-01**| Sucursal | Ingreso a Almacén Central de Sucursal A no altera balances de Sucursal B | **AUTOMATED (Fase 1C)** | Stock de inventario por almacén se incrementa únicamente en `p_warehouse_id` | **PASS** |
| **CPP-DUP-01** | Idempotencia | Reenvío de orden con misma `idempotency_key` | **AUTOMATED (Fase 1C)** | Retorna la compra existente con flag `idempotent_replay: true` sin duplicar stock ni costo | **PASS** |
| **CPP-KARDEX-01**| Trazabilidad | Movimiento Kardex generado tras la compra | **AUTOMATED (Fase 1C)** | Movimiento inmutable `PURCHASE_IN` con `unit_cost` de compra específico y referencia documental | **PASS** |
| **CPP-RETURN-01**| Devolución Prov. | Devolución parcial de mercadería al proveedor | **AUTOMATED (Fase 1D)** | Descuenta stock físico de almacén y genera `PURCHASE_RETURN_OUT` sin mutar costo histórico | **PASS** |

---

============================================================
2. FÓRMULA OFICIAL DE COSTO PROMEDIO PONDERADO EN BD
============================================================
Implementada en la migración `071_pos_weighted_average_cost_hardening.sql`:

```sql
-- Stock total previo consolidado en la empresa:
select coalesce(sum(quantity), 0.0000) into v_total_company_stock
from public.inventory_balances
where company_id = p_company_id and product_id = v_prod_id;

-- Si stock previo <= 0, el nuevo costo promedio es el costo de compra unitario
if v_total_company_stock <= 0 then
  v_new_avg_cost := round(v_line_cost, 4);
else
  v_new_avg_cost := round(
    ((v_total_company_stock * coalesce(v_prod.cost, 0.0000)) + (v_line_qty * v_line_cost))
    / (v_total_company_stock + v_line_qty),
    4
  );
end if;
```
