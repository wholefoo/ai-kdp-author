#!/usr/bin/env node

/**
 * Blog Posts Import Script for Production
 * 
 * This script imports blog posts from the JSON export file into your production database.
 * 
 * Usage:
 *   1. Ensure you have the blog_posts_export.json file in the same directory
 *   2. Set your production DATABASE_URL environment variable
 *   3. Run: node import_blog_posts.js
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { blogPosts } from './shared/schema.js';

async function importBlogPosts() {
  try {
    // Read the export file
    console.log('📖 Reading blog_posts_export.json...');
    const exportData = JSON.parse(readFileSync('./blog_posts_export.json', 'utf-8'));
    
    if (!exportData || exportData.length === 0) {
      console.log('❌ No blog posts found in export file.');
      return;
    }

    console.log(`✅ Found ${exportData.length} blog posts to import\n`);

    // Connect to production database
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    console.log('🔌 Connecting to production database...');
    const client = postgres(databaseUrl);
    const db = drizzle(client);

    // Import each blog post
    console.log('📝 Importing blog posts...\n');
    
    for (const post of exportData) {
      try {
        await db.insert(blogPosts).values({
          id: post.id,
          title: post.title,
          slug: post.slug,
          category: post.category,
          excerpt: post.excerpt,
          content: post.content,
          tags: post.tags || [],
          author: post.author,
          published: post.published,
          views: post.views || 0,
          readTime: post.read_time,
          publishedAt: post.published_at ? new Date(post.published_at) : null,
          createdAt: new Date(post.created_at),
        });
        
        console.log(`✅ Imported: "${post.title}"`);
      } catch (err) {
        if (err.message?.includes('duplicate key')) {
          console.log(`⚠️  Skipped (already exists): "${post.title}"`);
        } else {
          console.error(`❌ Error importing "${post.title}":`, err.message);
        }
      }
    }

    await client.end();
    
    console.log('\n🎉 Import completed successfully!');
    console.log(`📊 Total posts processed: ${exportData.length}`);
    
  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    process.exit(1);
  }
}

// Run the import
importBlogPosts();
