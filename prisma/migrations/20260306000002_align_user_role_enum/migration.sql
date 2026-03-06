-- Delete all existing users in dev (enum values are incompatible with old data)
DELETE FROM "User" CASCADE;

-- Rename old enum type
ALTER TYPE "UserRole" RENAME TO "UserRole_old";

-- Create new enum type with lowercase values matching the shared roles enum
CREATE TYPE "UserRole" AS ENUM ('admin', 'chef_projet', 'conducteur_travaux', 'collaborateur', 'client');

-- Update the User table column to use the new enum (no data to convert)
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING ('admin'::"UserRole");

-- Drop the old enum type
DROP TYPE "UserRole_old";
