-- Create beta_applications table for storing beta access requests
CREATE TABLE IF NOT EXISTS public.beta_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Application status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'converted')),
  admin_notes text,
  profile_id uuid REFERENCES public.profiles(id),
  
  -- User type
  user_type text NOT NULL CHECK (user_type IN ('family', 'provider', 'developer', 'organization')),
  
  -- Application fields
  problem_description text NOT NULL,
  current_solution text NOT NULL,
  data_volume text NOT NULL CHECK (data_volume IN ('1-10', '11-50', '51-200', '200+')),
  timeline text NOT NULL CHECK (timeline IN ('immediately', 'week', 'month', 'exploring')),
  
  -- Contact information
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  organization text,
  country text NOT NULL CHECK (country IN ('CZ', 'DE', 'US')),
  language text NOT NULL CHECK (language IN ('en', 'cs', 'de')),
  
  -- Additional info
  additional_info text,
  
  -- Agreements
  beta_agreement boolean NOT NULL DEFAULT false,
  feedback_agreement boolean NOT NULL DEFAULT false,
  confidentiality_agreement boolean NOT NULL DEFAULT false,
  terms_agreement boolean NOT NULL DEFAULT false,
  
  -- Processing metadata
  email_sent_at timestamp with time zone,
  approved_at timestamp with time zone,
  approved_by uuid REFERENCES auth.users(id),
  
  CONSTRAINT beta_applications_pkey PRIMARY KEY (id),
  CONSTRAINT beta_applications_email_key UNIQUE (email)
);

-- Create indexes for common queries
CREATE INDEX idx_beta_applications_status ON public.beta_applications(status);
CREATE INDEX idx_beta_applications_created_at ON public.beta_applications(created_at DESC);
CREATE INDEX idx_beta_applications_email ON public.beta_applications(email);

-- Enable Row Level Security
ALTER TABLE public.beta_applications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Allow anyone to insert a beta application (public form)
CREATE POLICY "Anyone can create beta applications" ON public.beta_applications
  FOR INSERT 
  WITH CHECK (true);

-- Only authenticated users with admin role can view applications
-- Since we don't have roles yet, we'll restrict to authenticated users
-- You can update this later to check for admin role
CREATE POLICY "Authenticated users can view beta applications" ON public.beta_applications
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only authenticated users can update applications (for admin management)
CREATE POLICY "Authenticated users can update beta applications" ON public.beta_applications
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_beta_applications_updated_at 
  BEFORE UPDATE ON public.beta_applications 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE public.beta_applications IS 'Stores beta access applications from the public website';
COMMENT ON COLUMN public.beta_applications.status IS 'Application status: pending, approved, rejected, or converted to user';
COMMENT ON COLUMN public.beta_applications.user_type IS 'Type of user: family, provider, developer, or organization';
COMMENT ON COLUMN public.beta_applications.profile_id IS 'Links to profiles table when user account is created';