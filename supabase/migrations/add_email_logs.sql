create table email_logs (
  id uuid primary key default gen_random_uuid(),
  recipient_email text not null,
  status text not null,        -- 'sent' or 'failed'
  error_message text,          -- null if successful
  children_count int,          -- how many children were in the quiz
  trigger_type text not null,  -- 'cron' or 'test'
  created_at timestamptz default now()
);

-- Allow service role full access (used by the serverless function)
-- Allow authenticated users to read (for admin page)
alter table email_logs enable row level security;

create policy "Service role can insert email logs"
  on email_logs for insert
  to service_role
  with check (true);

create policy "Authenticated users can read email logs"
  on email_logs for select
  to authenticated
  using (true);
