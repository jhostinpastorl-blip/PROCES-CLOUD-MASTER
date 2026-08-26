create or replace function public.touch_onboarding_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end;$$;
drop trigger if exists trg_onboarding_updated_at on public.onboarding_states;
create trigger trg_onboarding_updated_at before update on public.onboarding_states for each row execute function public.touch_onboarding_updated_at();
