#!/bin/bash

# Auto-setup script for all 3 projects
# This script will:
# 1. Discover sites for each project
# 2. Keep only the correct site for each project
# 3. Backfill aggregated data

set -e  # Exit on error

echo "🚀 Starting auto-setup for all projects..."
echo ""

# Project 32 - Điện Máy Xanh
echo "============================================================"
echo "📦 Setting up Project 32: Điện Máy Xanh"
echo "============================================================"

echo "🔍 Discovering sites..."
npx tsx apps/api/src/scripts/discover-gsc-sites.ts 32

echo "🗑️  Removing other sites..."
psql postgresql://kong.peterpan@localhost:5432/seo_impact_os -c "
DELETE FROM gsc_sites 
WHERE project_id = 32 
  AND site_url != 'https://www.dienmayxanh.com/';
"

echo "📊 Backfilling data..."
cd apps/api && npm run backfill-gsc-agg -- 32 2025-09-24 2025-12-24
cd ../..

echo "✅ Project 32 complete!"
echo ""

# Project 33 - Thế Giới Di Động
echo "============================================================"
echo "📦 Setting up Project 33: Thế Giới Di Động"
echo "============================================================"

echo "🔍 Discovering sites..."
npx tsx apps/api/src/scripts/discover-gsc-sites.ts 33

echo "🗑️  Removing other sites..."
psql postgresql://kong.peterpan@localhost:5432/seo_impact_os -c "
DELETE FROM gsc_sites 
WHERE project_id = 33 
  AND site_url != 'https://www.thegioididong.com/';
"

echo "📊 Backfilling data..."
cd apps/api && npm run backfill-gsc-agg -- 33 2025-09-24 2025-12-24
cd ../..

echo "✅ Project 33 complete!"
echo ""

echo "============================================================"
echo "🎉 ALL PROJECTS SETUP COMPLETE!"
echo "============================================================"
echo ""
echo "Summary:"
echo "  ✅ Project 31 (TopZone): 90 days"
echo "  ✅ Project 32 (Điện Máy Xanh): 90 days"
echo "  ✅ Project 33 (Thế Giới Di Động): 90 days"
echo ""
echo "You can now switch between projects in the dashboard!"
