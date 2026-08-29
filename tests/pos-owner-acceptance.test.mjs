import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("landing uses one focused product story without carousel controls", async () => {
  const [page, hero] = await Promise.all([
    read("src/app/page.tsx"),
    read("src/components/landing/FocusedProductHero.tsx"),
  ]);
  assert.match(page, /FocusedProductHero/);
  assert.doesNotMatch(page, /ProductHeroCarousel/);
  assert.match(hero, /Ventas del día/);
  assert.match(hero, /Caja actual/);
  assert.match(hero, /Stock crítico/);
  assert.doesNotMatch(hero, /Anterior|Siguiente|carousel/);
});

test("POS utility styles are compiled and first-run route covers first sale", async () => {
  const [pkg, css, config, page] = await Promise.all([
    read("package.json"), read("src/app/globals.css"), read("tailwind.config.ts"), read("src/app/app/pos/page.tsx"),
  ]);
  assert.match(pkg, /tailwindcss/);
  assert.match(css, /@tailwind utilities/);
  assert.match(config, /src\/app/);
  for (const step of ["Empresa", "POS activado", "Almacén", "Producto", "Stock", "Caja", "Turno", "Primera venta"]) {
    assert.match(page, new RegExp(step));
  }
});

test("product creation and audit are atomic and success redirects to persisted state", async () => {
  const [action, migration] = await Promise.all([
    read("src/app/app/pos/products/actions.ts"),
    read("supabase/migrations/075_pos_product_atomic_create_and_audit.sql"),
  ]);
  assert.match(action, /rpc\("create_pos_product"/);
  assert.match(action, /redirect\(`\/app\/pos\/products\?created=\$\{data\}`\)/);
  assert.match(migration, /insert into public\.products/);
  assert.match(migration, /insert into public\.audit_logs/);
  assert.match(migration, /security definer/);
  assert.match(migration, /is_company_member/);
  assert.match(migration, /has_permission/);
});
