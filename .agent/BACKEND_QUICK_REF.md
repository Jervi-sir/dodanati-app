# Quick Reference: Backend Implementation

## 🚀 Quick Start

### Step 1: Update Your Controller

Replace your `nearby()` method in `app/Http/Controllers/YourHazardController.php` with the code from:
```
.agent/updated-backend-nearby.php
```

### Step 2: Test It

```bash
# Test with viewport bounds (new way)
curl -X GET "http://localhost:8000/api/hazards/nearby" \
  -H "Accept: application/json" \
  -G \
  --data-urlencode "lat=36.7525" \
  --data-urlencode "lng=3.04197" \
  --data-urlencode "zoom=15" \
  --data-urlencode "minLat=36.74" \
  --data-urlencode "maxLat=36.76" \
  --data-urlencode "minLng=3.03" \
  --data-urlencode "maxLng=3.05"
```

### Step 3: Deploy

```bash
git add .
git commit -m "feat: add viewport-based hazard fetching with bounding box queries"
git push origin main
```

---

## 📋 Validation Rules

Add these to your existing validation:

```php
$data = $request->validate([
    // ... existing rules ...
    'minLat' => 'nullable|numeric|between:-90,90',
    'maxLat' => 'nullable|numeric|between:-90,90',
    'minLng' => 'nullable|numeric|between:-180,180',
    'maxLng' => 'nullable|numeric|between:-180,180',
]);
```

---

## 🔍 Key Code Snippets

### Detect Viewport vs Radius Mode

```php
$useViewport = isset($data['minLat']) && isset($data['maxLat']) 
            && isset($data['minLng']) && isset($data['maxLng']);
```

### Viewport Bounding Box Query

```php
if ($useViewport) {
    $minLat = (float) $data['minLat'];
    $maxLat = (float) $data['maxLat'];
    $minLng = (float) $data['minLng'];
    $maxLng = (float) $data['maxLng'];

    $baseQuery = RoadHazard::query()
        ->active()
        ->whereNotNull('geog')
        ->whereRaw(
            "ST_Contains(
                ST_MakeEnvelope(?, ?, ?, ?, 4326),
                geog::geometry
            )",
            [$minLng, $minLat, $maxLng, $maxLat]
        );
}
```

### Clusters with Viewport

```php
$clustersQuery = DB::table('road_hazards')
    ->selectRaw("
        COUNT(*) as count,
        ST_Y(ST_Centroid(ST_Collect(geog::geometry))) as lat,
        ST_X(ST_Centroid(ST_Collect(geog::geometry))) as lng
    ")
    ->where('is_active', true)
    ->whereNotNull('geog');

if ($useViewport) {
    $clustersQuery->whereRaw(
        "ST_Contains(
            ST_MakeEnvelope(?, ?, ?, ?, 4326),
            geog::geometry
        )",
        [$minLng, $minLat, $maxLng, $maxLat]
    );
}
```

---

## 🗃️ Database Setup

### Required Table Structure

```sql
-- Your road_hazards table should have:
CREATE TABLE road_hazards (
    id BIGSERIAL PRIMARY KEY,
    geog GEOGRAPHY(POINT, 4326),  -- ✅ This is key!
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    is_active BOOLEAN DEFAULT true,
    -- ... other columns ...
);
```

### Required Index

```sql
-- Spatial index (critical for performance!)
CREATE INDEX idx_road_hazards_geog_gist 
ON road_hazards 
USING GIST (geog);

-- Optional: Partial index for active hazards
CREATE INDEX idx_road_hazards_active_geog 
ON road_hazards 
USING GIST (geog) 
WHERE is_active = true;
```

---

## 🧪 Testing Queries

### Test Viewport Query Directly

```sql
-- Should return only hazards within the bounding box
SELECT id, lat, lng, 
       ST_AsText(geog::geometry) as location
FROM road_hazards
WHERE is_active = true
  AND geog IS NOT NULL
  AND ST_Contains(
    ST_MakeEnvelope(3.03, 36.74, 3.05, 36.76, 4326),
    geog::geometry
  )
LIMIT 10;
```

### Test Clustering Query

```sql
-- Test clustering within viewport
SELECT COUNT(*) as count,
       ST_Y(ST_Centroid(ST_Collect(geog::geometry))) as lat,
       ST_X(ST_Centroid(ST_Collect(geog::geometry))) as lng
FROM road_hazards
WHERE is_active = true
  AND geog IS NOT NULL
  AND ST_Contains(
    ST_MakeEnvelope(3.0, 36.7, 3.1, 36.8, 4326),
    geog::geometry
  )
GROUP BY ST_SnapToGrid(geog::geometry, 0.01);
```

### Check Index Usage

```sql
-- Verify the query uses the spatial index
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM road_hazards
WHERE is_active = true
  AND geog IS NOT NULL
  AND ST_Contains(
    ST_MakeEnvelope(3.03, 36.74, 3.05, 36.76, 4326),
    geog::geometry
  );

-- Look for "Index Scan using idx_road_hazards_geog_gist"
```

---

## 🐛 Common Issues & Fixes

### Issue 1: "function st_makeenvelope does not exist"

**Solution**: Install PostGIS extension
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Issue 2: Slow Queries

**Solution**: Ensure spatial index exists
```sql
-- Check if index exists
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'road_hazards';

-- Create if missing
CREATE INDEX idx_road_hazards_geog_gist 
ON road_hazards USING GIST (geog);
```

### Issue 3: Empty Results

**Solution**: Check data types
```php
// Ensure proper float conversion
$minLat = (float) $data['minLat'];
$maxLat = (float) $data['maxLat'];
$minLng = (float) $data['minLng'];
$maxLng = (float) $data['maxLng'];

// Debug: Log the envelope
\Log::info('Envelope', [
    'minLng' => $minLng, 'minLat' => $minLat,
    'maxLng' => $maxLng, 'maxLat' => $maxLat
]);
```

### Issue 4: Coordinates Order Confusion

**Solution**: PostGIS uses (lng, lat) order!
```php
// ✅ CORRECT - ST_MakeEnvelope(minLng, minLat, maxLng, maxLat)
ST_MakeEnvelope(3.03, 36.74, 3.05, 36.76, 4326)

// ❌ WRONG - Don't use (minLat, minLng, maxLat, maxLng)
ST_MakeEnvelope(36.74, 3.03, 36.76, 3.05, 4326)
```

---

## 📊 Response Format

### Points Mode Response

```json
{
  "mode": "points",
  "meta": {
    "viewport": {
      "minLat": 36.74,
      "maxLat": 36.76,
      "minLng": 3.03,
      "maxLng": 3.05
    },
    "returned_count": 45,
    "total_in_viewport": 47,
    "zoom": 15,
    "limit": 1000
  },
  "data": [
    {
      "id": 123,
      "lat": 36.7525,
      "lng": 3.04197,
      "severity": 3,
      "reports_count": 5,
      "category": {
        "id": 1,
        "slug": "pothole",
        "name_fr": "Nid-de-poule"
      }
    }
    // ... more hazards
  ]
}
```

### Clusters Mode Response

```json
{
  "mode": "clusters",
  "meta": {
    "viewport": {
      "minLat": 36.7,
      "maxLat": 36.8,
      "minLng": 3.0,
      "maxLng": 3.1
    },
    "total_in_viewport": 1247,
    "zoom": 11,
    "cell_deg": 0.05,
    "returned_clusters": 23,
    "limit": 40
  },
  "data": [
    {
      "lat": 36.7525,
      "lng": 3.04197,
      "count": 45
    }
    // ... more clusters
  ]
}
```

---

## ⚡ Performance Tips

### 1. Add Composite Index

```sql
CREATE INDEX idx_active_hazards_geog 
ON road_hazards (is_active) 
INCLUDE (geog, lat, lng, severity, reports_count)
WHERE is_active = true;
```

### 2. Use Query Caching

```php
// Cache for 30 seconds with viewport key
$cacheKey = sprintf(
    'hazards_%f_%f_%f_%f_%d',
    $minLat, $maxLat, $minLng, $maxLng, $zoom
);

return Cache::remember($cacheKey, 30, function() use ($baseQuery) {
    return $baseQuery->get();
});
```

### 3. Limit Results Appropriately

```php
$pointsLimit = match (true) {
    $zoom >= 16 => 500,    // Very zoomed in
    $zoom >= 14 => 1000,   // Street level
    $zoom >= 12 => 2000,   // Neighborhood
    default => 3000        // City/region
};
```

---

## 🔐 Security Considerations

### Validate Bounds

```php
// Ensure maxLat > minLat and maxLng > minLng
if ($useViewport) {
    if ($maxLat <= $minLat || $maxLng <= $minLng) {
        return response()->json([
            'error' => 'Invalid viewport bounds'
        ], 400);
    }
    
    // Prevent excessive viewport sizes (anti-abuse)
    $latSpan = $maxLat - $minLat;
    $lngSpan = $maxLng - $minLng;
    
    if ($latSpan > 10 || $lngSpan > 10) {
        return response()->json([
            'error' => 'Viewport too large'
        ], 400);
    }
}
```

### Rate Limiting

```php
// In routes/api.php
Route::middleware('throttle:60,1')->group(function () {
    Route::get('/hazards/nearby', [HazardController::class, 'nearby']);
});
```

---

## 📈 Monitoring

### Add Logging

```php
\Log::channel('performance')->info('Hazards query', [
    'method' => $useViewport ? 'viewport' : 'radius',
    'mode' => $mode,
    'count' => $totalCount,
    'duration' => microtime(true) - $startTime
]);
```

### Query Performance Dashboard

```sql
-- Track slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
WHERE query LIKE '%ST_Contains%'
ORDER BY mean_time DESC
LIMIT 10;
```

---

## ✅ Deployment Checklist

- [ ] PostGIS extension installed
- [ ] Spatial index exists on `geog` column  
- [ ] Backend code updated with viewport support
- [ ] Validation rules added for new params
- [ ] Tested with Postman/curl
- [ ] Checked query performance with EXPLAIN
- [ ] Verified backward compatibility (radius still works)
- [ ] Rate limiting configured
- [ ] Monitoring/logging added
- [ ] Deployed to staging
- [ ] Smoke tested on staging
- [ ] Deployed to production

---

## 🆘 Need Help?

### Debug Mode

Add this to your controller for verbose logging:

```php
if (config('app.debug')) {
    \DB::listen(function($query) {
        \Log::debug('SQL', [
            'sql' => $query->sql,
            'bindings' => $query->bindings,
            'time' => $query->time
        ]);
    });
}
```

### Check PostGIS Version

```sql
SELECT PostGIS_Version();
-- Should be 2.5 or higher for best performance
```

### Verify Data

```sql
-- Check if geog column is populated
SELECT COUNT(*) as total,
       COUNT(geog) as with_geog,
       COUNT(CASE WHEN is_active THEN 1 END) as active
FROM road_hazards;
```

---

**All set! Your backend is now ready for viewport-based queries! 🎉**
