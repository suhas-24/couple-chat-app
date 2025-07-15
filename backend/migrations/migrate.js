#!/usr/bin/env node

/**
 * Database Migration CLI Tool
 * Usage: node migrate.js [command] [options]
 */

const MigrationManager = require('./MigrationManager');
require('dotenv').config();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  const migrationManager = new MigrationManager();
  
  try {
    await migrationManager.connect();
    
    switch (command) {
      case 'migrate':
      case 'up':
        await migrationManager.migrate();
        break;
        
      case 'rollback':
      case 'down':
        const steps = parseInt(args[1]) || 1;
        await migrationManager.rollback(steps);
        break;
        
      case 'status':
        await migrationManager.status();
        break;
        
      case 'create':
        const migrationName = args[1];
        if (!migrationName) {
          console.error('Migration name is required');
          process.exit(1);
        }
        await createMigration(migrationName);
        break;
        
      case 'help':
      default:
        printHelp();
        break;
    }
    
  } catch (error) {
    console.error('Migration error:', error.message);
    process.exit(1);
  } finally {
    await migrationManager.disconnect();
  }
}

function printHelp() {
  console.log(`
Couple Chat App - Database Migration Tool

Usage: node migrate.js [command] [options]

Commands:
  migrate, up       Run all pending migrations
  rollback, down    Rollback migrations (default: 1 step)
  status           Show migration status
  create <name>    Create a new migration file
  help             Show this help message

Examples:
  node migrate.js migrate                    # Run all pending migrations
  node migrate.js rollback                   # Rollback last migration
  node migrate.js rollback 3                 # Rollback last 3 migrations
  node migrate.js status                     # Show migration status
  node migrate.js create add_user_preferences # Create new migration

Environment Variables:
  DATABASE_URL     MongoDB connection string (required)
  `);
}

async function createMigration(name) {
  const fs = require('fs');
  const path = require('path');
  
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const filename = `${timestamp}_${name}.js`;
  const filepath = path.join(__dirname, 'migrations', filename);
  
  const template = `const mongoose = require('mongoose');

/**
 * Migration: ${name}
 * Date: ${new Date().toISOString().slice(0, 10)}
 * Description: Add description here
 */

async function up() {
  console.log('Running migration: ${name}');
  
  // Add your migration logic here
  
  console.log('Migration ${name} completed successfully');
}

async function down() {
  console.log('Rolling back migration: ${name}');
  
  // Add your rollback logic here
  
  console.log('Migration ${name} rolled back successfully');
}

module.exports = {
  up,
  down
};`;

  fs.writeFileSync(filepath, template);
  console.log(`Migration created: ${filename}`);
}

main().catch(console.error);