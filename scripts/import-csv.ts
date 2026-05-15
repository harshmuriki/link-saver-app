import { parse } from 'csv-parse/sync'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Read env vars
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Get user ID from command line or use default
const userId = process.argv[2]
if (!userId) {
  console.error('Usage: npx tsx scripts/import-csv.ts <user_id>')
  console.error('Get your user ID from the users table in Supabase')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function importLinks() {
  // Read CSV file
  const csvPath = path.join(process.cwd(), 'scripts', 'notion-links.csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  
  // Parse CSV
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  })

  console.log(`Found ${records.length} records in CSV`)

  // Extract valid URLs and deduplicate
  const urlSet = new Set<string>()
  const links: { url: string; title: string | null }[] = []
  
  for (const record of records) {
    const sourceUrl = record['Source URL']?.trim()
    const name = record['Name']?.trim()
    
    // Skip if no valid URL or already seen
    if (!sourceUrl || !sourceUrl.startsWith('http') || urlSet.has(sourceUrl)) {
      continue
    }
    
    urlSet.add(sourceUrl)
    links.push({
      url: sourceUrl,
      title: name || null,
    })
  }

  console.log(`Found ${links.length} valid links to import`)

  // Insert links in batches
  const batchSize = 50
  let imported = 0
  let skipped = 0

  for (let i = 0; i < links.length; i += batchSize) {
    const batch = links.slice(i, i + batchSize)
    
    const linksToInsert = batch.map(link => {
      // Extract domain from URL
      let domain = null
      try {
        domain = new URL(link.url).hostname.replace('www.', '')
      } catch {}

      return {
        user_id: userId,
        url: link.url,
        title: link.title,
        domain,
        is_read: false,
        is_favorite: false,
        category: null,
      }
    })

    // Use upsert to handle duplicates (update if URL already exists for user)
    const { data, error } = await supabase
      .from('links')
      .upsert(linksToInsert, { 
        onConflict: 'user_id,url',
        ignoreDuplicates: false 
      })
      .select()

    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error.message)
      skipped += batch.length
    } else {
      imported += batch.length
      console.log(`Imported batch ${Math.floor(i / batchSize) + 1}: ${batch.length} links`)
    }
  }

  console.log(`\nImport complete!`)
  console.log(`- Imported/Updated: ${imported}`)
  console.log(`- Skipped (errors): ${skipped}`)
}

importLinks().catch(console.error)
