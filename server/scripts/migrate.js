const { initializeDatabase, closeDatabase } = require('../config/database');

const migrate = async () => {
  try {
    console.log('🔄 Starting database migration...');
    await initializeDatabase();
    console.log('✅ Database migration completed successfully!');
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
};

migrate();
