/**
 * Clear all resources from Supabase
 * Usage: node scripts/clear-resources.js
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import ws from 'ws';

// Load environment variables
config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('Please set PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

// Create Supabase client with service key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  global: {
    fetch: fetch,
  },
  realtime: {
    transport: ws,
  }
});

async function clearResources() {
  console.log('\n🗑️  Clearing resources table...\n');

  const { error } = await supabase
    .from('resources')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Match all rows

  if (error) {
    console.error('❌ Error clearing table:', error);
    process.exit(1);
  }

  console.log('✅ Resources table cleared!\n');
}

clearResources()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
