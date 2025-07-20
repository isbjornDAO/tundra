const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

async function wipeTournamentData() {
  const client = new MongoClient(uri);
  
  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    const db = client.db("tundra");
    
    console.log('🧹 Starting complete wipe of all tournament-related data...\n');
    
    // Collections to clean
    const collections = ['tournaments', 'teams', 'brackets', 'matches'];
    
    // Store counts before deletion for verification
    const beforeCounts = {};
    for (const collection of collections) {
      beforeCounts[collection] = await db.collection(collection).countDocuments({});
    }
    
    console.log('📊 Documents before deletion:');
    for (const collection of collections) {
      console.log(`  - ${collection}: ${beforeCounts[collection]} documents`);
    }
    console.log('');
    
    // Delete all documents from each collection
    const results = {};
    for (const collection of collections) {
      console.log(`🗑️  Deleting all documents from '${collection}' collection...`);
      const result = await db.collection(collection).deleteMany({});
      results[collection] = result.deletedCount;
      console.log(`   ✅ Deleted ${result.deletedCount} documents from ${collection}`);
    }
    
    console.log('\n🔍 Verifying collections are empty...');
    
    // Verify all collections are empty
    const afterCounts = {};
    let allEmpty = true;
    
    for (const collection of collections) {
      afterCounts[collection] = await db.collection(collection).countDocuments({});
      if (afterCounts[collection] > 0) {
        allEmpty = false;
        console.log(`   ❌ ${collection}: ${afterCounts[collection]} documents remaining`);
      } else {
        console.log(`   ✅ ${collection}: 0 documents (empty)`);
      }
    }
    
    console.log('\n📈 Summary:');
    console.log('=====================================');
    
    for (const collection of collections) {
      console.log(`${collection}:`);
      console.log(`  Before: ${beforeCounts[collection]} documents`);
      console.log(`  Deleted: ${results[collection]} documents`);
      console.log(`  After: ${afterCounts[collection]} documents`);
      console.log('');
    }
    
    if (allEmpty) {
      console.log('🎉 SUCCESS: All tournament-related data has been completely wiped!');
      console.log('✨ Database is clean and ready for fresh tournament data.');
    } else {
      console.log('⚠️  WARNING: Some documents may still remain in the database.');
      console.log('   Please check the collections manually.');
    }
    
  } catch (error) {
    console.error('❌ Error wiping tournament data:', error);
    process.exit(1);
  } finally {
    console.log('\n🔌 Closing database connection...');
    await client.close();
    console.log('✅ Database connection closed.');
  }
}

// Run the script
console.log('🚀 Starting Tournament Data Wipe Script');
console.log('⚠️  WARNING: This will permanently delete ALL tournament data!');
console.log('=====================================\n');

wipeTournamentData();