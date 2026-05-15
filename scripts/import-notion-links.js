import { createClient } from '@supabase/supabase-js'

// This script imports links from Notion to your link-saver database
// Run with: node --env-file-if-exists=/vercel/share/.env.project scripts/import-notion-links.js

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Links exported from Notion - paste your data here
// Format: { url: string, title?: string, created_at?: string }
const notionLinks = [
  // PASTE YOUR NOTION LINKS HERE
  // Example:
  // { url: "https://github.com/example/repo", title: "Example Repo", created_at: "2024-01-15T10:00:00Z" },
]

async function importLinks(userId) {
  console.log(`Importing ${notionLinks.length} links for user ${userId}...`)
  
  let imported = 0
  let skipped = 0
  let failed = 0

  for (const link of notionLinks) {
    if (!link.url) {
      console.log(`Skipping entry without URL: ${link.title || 'untitled'}`)
      skipped++
      continue
    }

    try {
      // Extract domain from URL
      let domain = null
      try {
        domain = new URL(link.url).hostname.replace('www.', '')
      } catch {}

      const { error } = await supabase
        .from('links')
        .upsert({
          user_id: userId,
          url: link.url,
          title: link.title || null,
          domain,
          is_read: false,
          is_favorite: false,
          category: null,
          created_at: link.created_at || new Date().toISOString(),
        }, {
          onConflict: 'user_id,url',
          ignoreDuplicates: false
        })

      if (error) {
        console.error(`Failed to import ${link.url}:`, error.message)
        failed++
      } else {
        imported++
        if (imported % 10 === 0) {
          console.log(`Imported ${imported} links...`)
        }
      }
    } catch (err) {
      console.error(`Error importing ${link.url}:`, err.message)
      failed++
    }
  }

  console.log(`\nImport complete!`)
  console.log(`  Imported: ${imported}`)
  console.log(`  Skipped: ${skipped}`)
  console.log(`  Failed: ${failed}`)
}

// Get the user ID from command line or use the first user
async function main() {
  const userId = process.argv[2]
  
  if (!userId) {
    // Get the first user's ID
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email')
      .limit(1)
    
    if (error || !users?.length) {
      console.error('No users found. Please sign up first or provide a user ID.')
      process.exit(1)
    }
    
    console.log(`Using user: ${users[0].email} (${users[0].id})`)
    await importLinks(users[0].id)
  } else {
    await importLinks(userId)
  }
}

main().catch(console.error)
