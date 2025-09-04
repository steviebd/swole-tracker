#!/usr/bin/env node

const { readFile } = require('fs/promises');
const { Client } = require('pg');

async function applyMigration() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    
    console.log('Reading migration file...');
    const sql = await readFile('drizzle/add-computed-columns.sql', 'utf8');
    
    console.log('Executing migration...');
    await client.query(sql);
    
    console.log('Migration applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();