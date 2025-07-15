const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

class MigrationManager {
  constructor() {
    this.migrationsPath = path.join(__dirname, 'migrations');
    this.migrationCollection = 'migrations';
  }

  async connect() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    
    await mongoose.connect(process.env.DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');
  }

  async disconnect() {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }

  async createMigrationRecord(filename) {
    const Migration = mongoose.model('Migration', new mongoose.Schema({
      filename: String,
      executedAt: { type: Date, default: Date.now }
    }));

    await Migration.create({ filename });
  }

  async getMigrationRecord(filename) {
    const Migration = mongoose.model('Migration', new mongoose.Schema({
      filename: String,
      executedAt: { type: Date, default: Date.now }
    }));

    return await Migration.findOne({ filename });
  }

  async getExecutedMigrations() {
    const Migration = mongoose.model('Migration', new mongoose.Schema({
      filename: String,
      executedAt: { type: Date, default: Date.now }
    }));

    const migrations = await Migration.find({}).sort({ executedAt: 1 });
    return migrations.map(m => m.filename);
  }

  async getPendingMigrations() {
    const migrationFiles = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.js'))
      .sort();

    const executedMigrations = await this.getExecutedMigrations();
    
    return migrationFiles.filter(file => !executedMigrations.includes(file));
  }

  async runMigration(filename) {
    const migrationPath = path.join(this.migrationsPath, filename);
    const migration = require(migrationPath);

    console.log(`Running migration: ${filename}`);
    
    if (typeof migration.up !== 'function') {
      throw new Error(`Migration ${filename} must export an 'up' function`);
    }

    await migration.up();
    await this.createMigrationRecord(filename);
    
    console.log(`Migration ${filename} completed successfully`);
  }

  async rollbackMigration(filename) {
    const migrationPath = path.join(this.migrationsPath, filename);
    const migration = require(migrationPath);

    console.log(`Rolling back migration: ${filename}`);
    
    if (typeof migration.down !== 'function') {
      throw new Error(`Migration ${filename} must export a 'down' function`);
    }

    await migration.down();
    
    // Remove migration record
    const Migration = mongoose.model('Migration', new mongoose.Schema({
      filename: String,
      executedAt: { type: Date, default: Date.now }
    }));
    
    await Migration.deleteOne({ filename });
    
    console.log(`Migration ${filename} rolled back successfully`);
  }

  async migrate() {
    const pendingMigrations = await this.getPendingMigrations();
    
    if (pendingMigrations.length === 0) {
      console.log('No pending migrations');
      return;
    }

    console.log(`Found ${pendingMigrations.length} pending migrations`);
    
    for (const filename of pendingMigrations) {
      await this.runMigration(filename);
    }
    
    console.log('All migrations completed');
  }

  async rollback(steps = 1) {
    const executedMigrations = await this.getExecutedMigrations();
    
    if (executedMigrations.length === 0) {
      console.log('No migrations to rollback');
      return;
    }

    const migrationsToRollback = executedMigrations
      .slice(-steps)
      .reverse();

    console.log(`Rolling back ${migrationsToRollback.length} migrations`);
    
    for (const filename of migrationsToRollback) {
      await this.rollbackMigration(filename);
    }
    
    console.log('Rollback completed');
  }

  async status() {
    const executedMigrations = await this.getExecutedMigrations();
    const pendingMigrations = await this.getPendingMigrations();
    
    console.log('\n=== Migration Status ===');
    console.log(`Executed: ${executedMigrations.length}`);
    console.log(`Pending: ${pendingMigrations.length}`);
    
    if (executedMigrations.length > 0) {
      console.log('\nExecuted migrations:');
      executedMigrations.forEach(migration => {
        console.log(`  ✓ ${migration}`);
      });
    }
    
    if (pendingMigrations.length > 0) {
      console.log('\nPending migrations:');
      pendingMigrations.forEach(migration => {
        console.log(`  ⏳ ${migration}`);
      });
    }
  }
}

module.exports = MigrationManager;