-- Migration: Add BIP39 Recovery Keys Support
-- Date: 2025-01-XX
-- Description: Add recovery key storage and versioning to support BIP39 mnemonic recovery

-- Add recovery key fields to private_keys table
ALTER TABLE public.private_keys 
ADD COLUMN recovery_key text,
ADD COLUMN recovery_key_hash text,
ADD COLUMN key_version integer NOT NULL DEFAULT 0,
ADD COLUMN recovery_created_at timestamp with time zone,
ADD COLUMN recovery_verified_at timestamp with time zone;

-- Add index for faster key version lookups
CREATE INDEX idx_private_keys_key_version ON public.private_keys(key_version);

-- Add index for recovery key hash lookups
CREATE INDEX idx_private_keys_recovery_hash ON public.private_keys(recovery_key_hash) WHERE recovery_key_hash IS NOT NULL;

-- Create recovery_attempts table for tracking recovery usage
CREATE TABLE public.recovery_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  attempt_type text NOT NULL CHECK (attempt_type IN ('mnemonic_verification', 'key_recovery', 'passphrase_reset')),
  ip_address inet,
  user_agent text,
  success boolean NOT NULL DEFAULT false,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT recovery_attempts_pkey PRIMARY KEY (id),
  CONSTRAINT recovery_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Add index for monitoring recovery attempts
CREATE INDEX idx_recovery_attempts_user_created ON public.recovery_attempts(user_id, created_at DESC);
CREATE INDEX idx_recovery_attempts_type_created ON public.recovery_attempts(attempt_type, created_at DESC);

-- Create security_migrations table to track key migrations
CREATE TABLE public.security_migrations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  from_version integer NOT NULL,
  to_version integer NOT NULL,
  migration_type text NOT NULL,
  migration_data jsonb,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  failed_at timestamp with time zone,
  error_message text,
  CONSTRAINT security_migrations_pkey PRIMARY KEY (id),
  CONSTRAINT security_migrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Add index for migration tracking
CREATE INDEX idx_security_migrations_user_version ON public.security_migrations(user_id, to_version);
CREATE INDEX idx_security_migrations_type_created ON public.security_migrations(migration_type, started_at DESC);

-- Add comments for documentation
COMMENT ON COLUMN public.private_keys.recovery_key IS 'Private key encrypted with recovery key derived from BIP39 mnemonic';
COMMENT ON COLUMN public.private_keys.recovery_key_hash IS 'Hash of the BIP39 mnemonic for verification (bcrypt)';
COMMENT ON COLUMN public.private_keys.key_version IS 'Version of encryption scheme: 0=RSA-OAEP-2048, 1=RSA+Recovery, 2=Hybrid-RSA-MLKEM, 3=MLKEM-1024';
COMMENT ON COLUMN public.private_keys.recovery_created_at IS 'When recovery key was first generated';
COMMENT ON COLUMN public.private_keys.recovery_verified_at IS 'When user last verified recovery phrase';

COMMENT ON TABLE public.recovery_attempts IS 'Audit log for all recovery-related operations';
COMMENT ON TABLE public.security_migrations IS 'Track user key migration history for security updates';

-- Create function to validate recovery key format
CREATE OR REPLACE FUNCTION validate_recovery_key_hash(hash_value text)
RETURNS boolean AS $$
BEGIN
  -- Validate bcrypt hash format (starts with $2a$, $2b$, or $2y$)
  RETURN hash_value ~ '^\$2[aby]\$\d{2}\$.{53}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add constraint to ensure recovery_key_hash is valid bcrypt when present
ALTER TABLE public.private_keys 
ADD CONSTRAINT private_keys_recovery_hash_format 
CHECK (recovery_key_hash IS NULL OR validate_recovery_key_hash(recovery_key_hash));

-- Create function to check if user has recovery key set up
CREATE OR REPLACE FUNCTION user_has_recovery_key(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.private_keys pk
    JOIN public.profiles p ON pk.id = p.id
    WHERE p.id = user_id 
    AND pk.recovery_key IS NOT NULL 
    AND pk.recovery_key_hash IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Create RLS policies for recovery_attempts table
ALTER TABLE public.recovery_attempts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own recovery attempts
CREATE POLICY "Users can view own recovery attempts" ON public.recovery_attempts
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM public.profiles WHERE auth_id = auth.uid()
    )
  );

-- Policy: System can insert recovery attempts (via service role)
CREATE POLICY "System can insert recovery attempts" ON public.recovery_attempts
  FOR INSERT WITH CHECK (true);

-- Create RLS policies for security_migrations table  
ALTER TABLE public.security_migrations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own migration history
CREATE POLICY "Users can view own migrations" ON public.security_migrations
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM public.profiles WHERE auth_id = auth.uid()
    )
  );

-- Policy: System can manage migrations (via service role)
CREATE POLICY "System can manage migrations" ON public.security_migrations
  FOR ALL WITH CHECK (true);

-- Add trigger to automatically update recovery_verified_at when recovery is used successfully
CREATE OR REPLACE FUNCTION update_recovery_verified_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.attempt_type = 'key_recovery' AND NEW.success = true THEN
    UPDATE public.private_keys 
    SET recovery_verified_at = NEW.created_at
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_recovery_verified
  AFTER INSERT ON public.recovery_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_recovery_verified_timestamp();

-- Migration script to update existing users to key_version = 0
UPDATE public.private_keys 
SET key_version = 0 
WHERE key_version IS NULL;

-- Grant permissions for application access
GRANT SELECT, INSERT, UPDATE ON public.recovery_attempts TO authenticated;
GRANT SELECT ON public.security_migrations TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_recovery_key(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_recovery_key_hash(text) TO authenticated;