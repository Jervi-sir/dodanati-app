# Map Improvements: Center Location & Viewport-Based Marker Fetching

## Overview

This update implements two major improvements to your map functionality:

1. **Centered User Location**: User's location now appears in the exact center of the screen
2. **Viewport-Based Marker Fetching**: Markers are now fetched based on what's visible in the viewport, not a fixed 10km radius

---

## 🎯 Change 1: Centered User Location

### What Changed
**File**: `contexts/3-location-context.tsx`

The `recenterOnUser` function now uses `animateCamera` with precise center positioning instead of `animateToRegion`.

### Before:
```typescript
mapRef.current?.animateToRegion(newRegion, 500);
```

### After:
```typescript
mapRef.current?.animateCamera({
  center: {
    latitude: currentLat,
    longitude: currentLng,
  },
  zoom: 15,
}, { duration: 500 });
```

### Why This Matters
- **Precise Centering**: `animateCamera` ensures the location is in the exact center of the screen
- **Consistent Zoom**: Maintains a predictable zoom level (15) when recentering
- **Better UX**: Users always know exactly where they are on the map

---

## 🗺️ Change 2: Viewport-Based Marker Fetching

### Frontend Changes

#### File: `contexts/5-hazard-context.tsx`

**1. New Function: `calculateViewportBounds`**
```typescript
const calculateViewportBounds = (region: Region) => {
  const latDelta = region.latitudeDelta;
  const lngDelta = region.longitudeDelta;
  return {
    minLat: region.latitude - latDelta / 2,
    maxLat: region.latitude + latDelta / 2,
    minLng: region.longitude - lngDelta / 2,
    maxLng: region.longitude + lngDelta / 2,
  };
};
```

**2. Updated `fetchNearby` Function**
- Now accepts `currentRegion` parameter
- Calculates viewport bounds
- Sends `minLat`, `maxLat`, `minLng`, `maxLng` to backend instead of `radius_km`

**3. Improved Fetch Threshold**
- Changed from 2km to 3km movement before refetching
- Reduces unnecessary API calls while maintaining smooth experience

### Backend Changes

#### File: `.agent/updated-backend-nearby.php`

**Key Features:**
1. **Dual Mode Support**: Handles both viewport bounds AND radius for backward compatibility
2. **Bounding Box Query**: Uses PostGIS `ST_MakeEnvelope` and `ST_Contains` for viewport queries
3. **Optimized Performance**: Only fetches markers visible in the current viewport

**New Validation Rules:**
```php
'minLat' => 'nullable|numeric|between:-90,90',
'maxLat' => 'nullable|numeric|between:-90,90',
'minLng' => 'nullable|numeric|between:-180,180',
'maxLng' => 'nullable|numeric|between:-180,180',
```

**Query Logic:**
```php
if ($useViewport) {
    // Viewport-based query using bounding box
    $baseQuery->whereRaw(
        "ST_Contains(
            ST_MakeEnvelope(?, ?, ?, ?, 4326),
            geog::geometry
        )",
        [$minLng, $minLat, $maxLng, $maxLat]
    );
}
```

---

## 📊 How It Works Together

### Request Flow:

1. **User pans/zooms map**
   ```
   Map Region Changes
   ↓
   calculateViewportBounds()
   ↓
   minLat, maxLat, minLng, maxLng
   ```

2. **API Request**
   ```typescript
   GET /api/hazards/nearby
   {
     lat: 36.7525,
     lng: 3.04197,
     zoom: 15,
     mode: 'auto',
     minLat: 36.7375,  // calculated from viewport
     maxLat: 36.7675,
     minLng: 3.02697,
     maxLng: 3.05697
   }
   ```

3. **Backend Processing**
   ```
   Detects viewport params
   ↓
   Creates bounding box (PostGIS)
   ↓
   Queries only markers in viewport
   ↓
   Returns filtered results
   ```

4. **Frontend Display**
   ```
   Receives markers
   ↓
   Updates hazards/clusters state
   ↓
   Map displays only visible markers
   ```

---

## 🎨 Benefits

### Performance
- ✅ **Fewer markers**: Only loads what's visible
- ✅ **Faster queries**: PostGIS bounding box queries are highly optimized
- ✅ **Reduced network traffic**: Smaller response payloads
- ✅ **Smarter refetching**: 3km threshold prevents excessive API calls

### User Experience
- ✅ **Precise centering**: User location always in center of screen
- ✅ **Responsive map**: Updates as user explores
- ✅ **Predictable behavior**: Shows exactly what you see
- ✅ **Better navigation**: No surprise markers far from view

### Scalability
- ✅ **Handles dense areas**: Won't load 10,000 markers if zoomed in on one street
- ✅ **Efficient zooming**: Automatically adjusts data density
- ✅ **Clusters work better**: Clusters based on actual viewport

---

## 🚀 How to Deploy Backend Changes

1. **Locate your controller** (e.g., `app/Http/Controllers/RoadHazardController.php`)

2. **Replace the `nearby()` method** with the code from:
   ```
   .agent/updated-backend-nearby.php
   ```

3. **Test the endpoint**:
   ```bash
   # Test viewport-based query
   curl "http://your-api.test/api/hazards/nearby?lat=36.7525&lng=3.04197&zoom=15&minLat=36.74&maxLat=36.76&minLng=3.03&maxLng=3.05"
   
   # Test backward-compatible radius query
   curl "http://your-api.test/api/hazards/nearby?lat=36.7525&lng=3.04197&radius_km=5"
   ```

4. **Deploy**:
   ```bash
   git add .
   git commit -m "feat: add viewport-based hazard fetching"
   git push
   ```

---

## 🧪 Testing Checklist

### Frontend Testing
- [ ] Tap recenter button - location appears in exact center
- [ ] Pan map - new markers load when viewport changes significantly
- [ ] Zoom in/out - appropriate markers appear/disappear
- [ ] Check debug overlay - hazard count updates correctly

### Backend Testing
- [ ] Viewport params received correctly
- [ ] Bounding box query returns correct markers
- [ ] Cluster mode works with viewport
- [ ] Fallback to radius mode works (backward compatibility)
- [ ] Performance is acceptable (< 200ms query time)

---

## 📝 Migration Notes

### Breaking Changes
**None!** The backend is fully backward compatible. Old clients using `radius_km` will continue to work.

### Rollback Plan
If you need to rollback:
1. Revert `contexts/5-hazard-context.tsx` changes
2. Keep backend as-is (it supports both modes)

---

## 🔍 Debug Tips

### Check what's being sent:
```typescript
// In fetchNearby, add:
console.log('Viewport bounds:', {
  minLat: bounds.minLat,
  maxLat: bounds.maxLat,
  minLng: bounds.minLng,
  maxLng: bounds.maxLng,
});
```

### Check backend query:
```php
// In your controller, add:
\Log::info('Nearby query', [
    'method' => $useViewport ? 'viewport' : 'radius',
    'bounds' => $useViewport ? [$minLat, $maxLat, $minLng, $maxLng] : null,
    'count' => $totalCount
]);
```

### Verify PostGIS:
```sql
-- Test bounding box query directly
SELECT COUNT(*)
FROM road_hazards
WHERE is_active = true
  AND geog IS NOT NULL
  AND ST_Contains(
    ST_MakeEnvelope(3.03, 36.74, 3.05, 36.76, 4326),
    geog::geometry
  );
```

---

## 📚 References

- [PostGIS ST_MakeEnvelope](https://postgis.net/docs/ST_MakeEnvelope.html)
- [PostGIS ST_Contains](https://postgis.net/docs/ST_Contains.html)
- [React Native Maps Camera](https://github.com/react-native-maps/react-native-maps/blob/master/docs/mapview.md#methods)

---

## ✅ Summary

| Feature | Before | After |
|---------|--------|-------|
| **Location Centering** | Approximate (animateToRegion) | Precise (animateCamera) |
| **Marker Fetching** | Fixed 10km radius | Dynamic viewport bounds |
| **API Calls** | Every 2km movement | Every 3km movement |
| **Query Method** | Distance-based | Bounding box |
| **Performance** | May load 1000s of markers | Loads only visible markers |
| **Backend** | Radius only | Radius + Viewport (dual mode) |

All changes are complete and ready to test! 🎉
