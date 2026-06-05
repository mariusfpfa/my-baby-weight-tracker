alter table public.device_requests
  add column if not exists approved_device_id uuid references public.devices(id) on delete set null;

create index if not exists device_requests_approved_device_idx
  on public.device_requests(approved_device_id);
