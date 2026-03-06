-- Invalidate all existing plaintext refresh tokens (cannot be migrated to hashed form)
DELETE FROM "RefreshToken";

-- Rename column token -> tokenHash
ALTER TABLE "RefreshToken" RENAME COLUMN "token" TO "tokenHash";
