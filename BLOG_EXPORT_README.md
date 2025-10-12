# Blog Posts Export - Production Import Guide

This directory contains exported blog posts from your development environment that can be imported into production.

## 📦 Export Files

1. **blog_posts_export.json** - JSON format with all 10 blog posts
2. **blog_posts_export.sql** - SQL INSERT statements
3. **import_blog_posts.js** - Automated Node.js import script

## 🚀 Quick Start - Import to Production

### Option 1: Using the Node.js Import Script (Recommended)

This is the easiest and safest method:

```bash
# 1. Set your production database URL
export DATABASE_URL="your_production_database_url"

# 2. Run the import script
node import_blog_posts.js
```

The script will:
- ✅ Read the JSON export file
- ✅ Connect to your production database
- ✅ Import all 10 blog posts
- ✅ Skip duplicates if posts already exist
- ✅ Show detailed progress and results

### Option 2: Using SQL Directly

If you prefer to use SQL directly:

```bash
# Connect to your production database and run:
psql YOUR_PRODUCTION_DATABASE_URL < blog_posts_export.sql
```

### Option 3: Manual Database Import

1. Open your database management tool (Replit Database Pane, pgAdmin, etc.)
2. Connect to your production database
3. Run the contents of `blog_posts_export.sql`

## 📊 What's Being Imported

**Total Posts:** 10 blog articles

**Categories:**
- KDP Tips (2 posts)
- Writing Craft (2 posts)
- Marketing (2 posts)
- Research (2 posts)
- Sales (2 posts)

**Sample Posts:**
- "How to Optimize Your KDP Book Listing for Maximum Visibility"
- "Creating Compelling Characters That Readers Can't Forget"
- "The Ultimate Book Launch Strategy for Self-Published Authors"
- And 7 more...

## ⚠️ Important Notes

1. **Unique Constraints:** The import script handles duplicate slugs gracefully - if a post with the same slug exists, it will be skipped
2. **IDs are preserved:** The original UUIDs from dev are maintained for consistency
3. **Published Status:** All posts are marked as `published: true` and ready to display
4. **View Counts:** Posts start with views set to 0 (or their dev value)

## 🔧 Troubleshooting

### "Blog posts already exist"
If posts already exist in production, the Node.js script will skip them. To force reimport:
1. Delete existing posts from production first
2. Then run the import script

### "DATABASE_URL not set"
Make sure you've exported the production database URL:
```bash
export DATABASE_URL="postgresql://user:password@host:port/database"
```

### "Module not found"
Ensure you're running from the project root directory where `shared/schema.js` exists.

## ✅ Verification

After importing, verify the blog posts in production:

1. **Check the database:**
   ```sql
   SELECT COUNT(*) FROM blog_posts;
   -- Should return: 10
   ```

2. **Visit your blog page:**
   - Navigate to `/blog` in production
   - All 10 posts should be visible
   - Click on individual posts to verify content

3. **Admin verification:**
   - Log in to Admin Dashboard
   - Go to Blog Management tab
   - Verify all posts are listed

## 📝 Post-Import Tasks

After importing to production:

1. ✅ Verify all 10 posts appear on `/blog`
2. ✅ Check markdown rendering is correct
3. ✅ Test individual post pages
4. ✅ Verify SEO metadata (titles, descriptions)
5. ✅ Check admin blog management functions

## 🎉 Success!

Once imported, your production blog will have all 10 professionally written articles covering:
- KDP optimization strategies
- Writing craft techniques
- Marketing and promotion tips
- Content research methods
- Sales optimization tactics

These articles will help attract and engage your target audience of self-publishing authors!
