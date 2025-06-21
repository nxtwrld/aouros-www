-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  content text NOT NULL,
  metadata text NOT NULL,
  user_id uuid NOT NULL,
  type USER-DEFINED NOT NULL DEFAULT 'document'::"DocumentTypes",
  author_id uuid NOT NULL DEFAULT auth.uid(),
  attachments ARRAY NOT NULL DEFAULT '{}'::character varying[],
  CONSTRAINT documents_pkey PRIMARY KEY (id),
  CONSTRAINT documents_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(auth_id),
  CONSTRAINT documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.keys (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  document_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  user_id uuid NOT NULL,
  key text NOT NULL,
  author_id uuid NOT NULL DEFAULT auth.uid(),
  CONSTRAINT keys_pkey PRIMARY KEY (id),
  CONSTRAINT keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT keys_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(auth_id),
  CONSTRAINT keys_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id),
  CONSTRAINT keys_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.private_keys (
  id uuid NOT NULL,
  privateKey text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  key_hash text NOT NULL DEFAULT ''::text,
  key_pass text,
  CONSTRAINT private_keys_pkey PRIMARY KEY (id),
  CONSTRAINT private_keys_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profiles (
  auth_id uuid UNIQUE,
  updated_at timestamp with time zone DEFAULT now(),
  fullName text,
  avatarUrl text,
  subscription USER-DEFINED DEFAULT 'individual'::subscription,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  publicKey text,
  language text DEFAULT 'cs'::text,
  email text,
  owner_id uuid,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_auth_id_fkey FOREIGN KEY (auth_id) REFERENCES auth.users(id),
  CONSTRAINT profiles_owner_id_fkey1 FOREIGN KEY (owner_id) REFERENCES auth.users(id)
);
CREATE TABLE public.profiles_links (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  profile_id uuid,
  parent_id uuid,
  status USER-DEFINED NOT NULL DEFAULT 'request'::link_status,
  CONSTRAINT profiles_links_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_links_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.profiles(id),
  CONSTRAINT profiles_links_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.subscriptions (
  id uuid NOT NULL,
  profiles integer DEFAULT 1,
  scans integer DEFAULT 10,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(auth_id)
);