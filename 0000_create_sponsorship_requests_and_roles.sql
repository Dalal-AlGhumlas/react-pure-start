-- Roles
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can read own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Sponsorship requests
CREATE TYPE public.request_status AS ENUM ('new', 'under_review', 'contacted', 'accepted', 'rejected');

CREATE TABLE public.sponsorship_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number text NOT NULL UNIQUE,
  full_name text NOT NULL,
  company_name text NOT NULL,
  job_title text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  website text,
  partnership_type text NOT NULL,
  program_interest text,
  estimated_budget text,
  message text,
  status public.request_status NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.sponsorship_requests TO authenticated;
GRANT ALL ON public.sponsorship_requests TO service_role;

ALTER TABLE public.sponsorship_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read requests"
ON public.sponsorship_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update requests"
ON public.sponsorship_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Reference number counter (LAW-YYYY-0001)
CREATE TABLE public.reference_counters (
  year integer PRIMARY KEY,
  last_value integer NOT NULL DEFAULT 0
);

GRANT ALL ON public.reference_counters TO service_role;
ALTER TABLE public.reference_counters ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_reference_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  y integer := EXTRACT(YEAR FROM now())::integer;
  n integer;
BEGIN
  IF NEW.reference_number IS NOT NULL AND NEW.reference_number <> '' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.reference_counters (year, last_value)
  VALUES (y, 1)
  ON CONFLICT (year) DO UPDATE SET last_value = public.reference_counters.last_value + 1
  RETURNING last_value INTO n;

  NEW.reference_number := 'LAW-' || y::text || '-' || lpad(n::text, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_reference_number
BEFORE INSERT ON public.sponsorship_requests
FOR EACH ROW EXECUTE FUNCTION public.set_reference_number();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_touch_sponsorship_requests
BEFORE UPDATE ON public.sponsorship_requests
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
