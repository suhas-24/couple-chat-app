#!/usr/bin/env node

/**
 * Database Seeding CLI Tool
 * Usage: node seed.js [environment]
 */

const DatabaseSeeder = require('./DatabaseSeeder');
require('dotenv').config();

async function main() {
  const environment = process.argv[2] || 'development';
  
  console.log(`Starting database seeding for ${environment} environment...`);
  
  // Load environment-specific configuration
  if (environment === 'production') {
    console.warn('WARNING: You are about to seed the production database!');
    console.warn('This will delete all existing data.');
    console.warn('Type "yes" to continue, anything else to cancel.');
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise((resolve) => {
      rl.question('Continue? ', resolve);
    });
    
    rl.close();
    
    if (answer.toLowerCase() !== 'yes') {
      console.log('Seeding cancelled.');
      process.exit(0);
    }
  }
  
  const seeder = new DatabaseSeeder();
  
  try {
    await seeder.seed();
    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);