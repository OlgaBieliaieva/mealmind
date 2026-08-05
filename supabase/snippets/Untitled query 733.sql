INSERT INTO public.users (
  id,
  external_subject,
  email,
  application_role,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'fdc5463f-3e6e-4e4c-93de-d75243845692',
  'test-admin@mealmind.com',
  'user',
  now()
);