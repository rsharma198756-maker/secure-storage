#!/usr/bin/env node
/**
 * One-time migration runner for Railway PostgreSQL.
 * Usage:
 *   node run-migrations.mjs <DATABASE_URL>
 *   DATABASE_URL=... node run-migrations.mjs
 *
 * Example:
 *   node run-migrations.mjs "postgresql://postgres:password@host:5432/railway"
 */

import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const databaseUrl = process.argv[2] ?? process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error('❌ DATABASE_URL is required.');
    console.error('   Usage: node run-migrations.mjs <DATABASE_URL>');
    console.error('   Or:    DATABASE_URL=postgresql://... node run-migrations.mjs');
    process.exit(1);
}

// Dynamically import pg (already installed in node_modules)
const { default: pg } = await import('pg');
const { Client } = pg;

const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

const migrations = [
    join(__dirname, 'db/init/001_init.sql'),
    join(__dirname, 'db/init/002_passwords_and_roles.sql'),
    join(__dirname, 'db/init/003_security_controls.sql'),
    join(__dirname, 'db/init/004_hard_delete_legacy_deleted_users.sql'),
    join(__dirname, 'db/init/005_remove_super_admin.sql'),
    join(__dirname, 'db/init/006_phone_numbers_and_sms_otp.sql'),
];

async function run() {
    console.log('🔌 Connecting to Railway PostgreSQL...');
    await client.connect();
    console.log('✅ Connected!\n');

    for (const migrationFile of migrations) {
        const fileName = migrationFile.split('/').pop();
        console.log(`📄 Running: ${fileName}`);
        try {
            const sql = readFileSync(migrationFile, 'utf8');
            await client.query(sql);
            console.log(`✅ Done: ${fileName}\n`);
        } catch (err) {
            console.error(`❌ Failed: ${fileName}`);
            console.error(err.message);
            await client.end();
            process.exit(1);
        }
    }

    console.log('🎉 All migrations ran successfully!');
    console.log('👤 Admin user: solutionnyx@gmail.com / Admin@123');
    await client.end();
}

run().catch(async (err) => {
    console.error('❌ Error:', err.message);
    await client.end().catch(() => { });
    process.exit(1);
});
