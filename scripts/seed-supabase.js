/**
 * Seed Supabase with resources from resources.json.
 *
 * Usage:
 *   1. Populate .env with Supabase credentials.
 *   2. Run: node scripts/seed-supabase.js
 *
 * Behavior:
 *   - Reads resources.json (the authored source of record).
 *   - Transforms each entry to the database schema.
 *   - Upserts on slug so existing rows and upvote counts are preserved.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';
import ws from 'ws';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase credentials from .env
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Service key for write access

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('Please set PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

// Service-key client bypasses RLS for writes.
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  global: {
    fetch: fetch,
  },
  realtime: {
    transport: ws,
  }
});

// Read resources.json
const resourcesPath = join(__dirname, '../src/content/resources.json');
let resources;

try {
  const fileContent = readFileSync(resourcesPath, 'utf-8');
  resources = JSON.parse(fileContent);
  console.log(`📖 Read ${resources.length} resources from resources.json`);
} catch (error) {
  console.error('❌ Error reading resources.json:', error);
  process.exit(1);
}

/**
 * Map a resources.json entry to the database schema.
 * The JSON `id` field is the slug; the JSON `link` field is the db `url`.
 */
function transformResource(resource) {
  return {
    slug: resource.id,
    name: resource.name,
    description: resource.description,
    url: resource.link || resource.url,
    category: resource.category,
    eligibility: resource.eligibility || [],
    last_verified: resource.last_verified || new Date().toISOString().split('T')[0],
    notes: resource.notes || null,
    source: resource.source || null,
    added_at: resource.added_at || resource.date_added || new Date().toISOString(),
    added_by: resource.added_by || 'human',
    // upvotes omitted on upsert so existing counts survive a re-seed.
    // Only 'broken'/'inactive' hide a resource; 'needs_review' stays visible.
    is_active: resource.status ? !['broken', 'inactive'].includes(resource.status) : true,
    annual_value: resource.annual_value ?? null,
    date_added: resource.date_added || new Date().toISOString().split('T')[0],
    hidden_gem: resource.hidden_gem || false,
  };
}

/**
 * Main seeding function
 */
async function seedDatabase() {
  console.log('\n🌱 Starting database seed...\n');

  const transformedResources = resources.map(transformResource);

  // Batch the upserts to avoid overwhelming the database.
  const BATCH_SIZE = 50;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < transformedResources.length; i += BATCH_SIZE) {
    const batch = transformedResources.slice(i, i + BATCH_SIZE);

    console.log(`📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} resources)...`);

    // Upsert on slug to keep the database a clean projection of the catalog.
    const { data, error } = await supabase
      .from('resources')
      .upsert(batch, {
        onConflict: 'slug',
        ignoreDuplicates: false
      })
      .select('id, name');

    if (error) {
      console.error('❌ Error inserting batch:', error);
      errorCount += batch.length;
    } else {
      successCount += data.length;
      console.log(`✅ Inserted ${data.length} resources`);
    }
  }

  console.log('\n📊 Seeding complete!');
  console.log(`   ✅ Success: ${successCount} resources`);
  if (errorCount > 0) {
    console.log(`   ❌ Errors: ${errorCount} resources`);
  }

  // Verify the row count.
  const { count, error: countError } = await supabase
    .from('resources')
    .select('*', { count: 'exact', head: true });

  if (!countError) {
    console.log(`\n📈 Total resources in database: ${count}`);
  }
}

// Run the seed
seedDatabase()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
