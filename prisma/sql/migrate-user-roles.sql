-- Remplace le rôle `admin` par `owner` et ajoute `admin_organization`.
-- À lancer AVANT `prisma db push` sur une base existante : sans ce script,
-- db push refuse de supprimer la valeur `admin` encore utilisée.
-- Idempotent : peut être relancé sans effet.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'UserRole' AND e.enumlabel = 'admin'
  ) THEN
    ALTER TYPE "UserRole" RENAME VALUE 'admin' TO 'owner';
  END IF;
END $$;

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'admin_organization' AFTER 'owner';
