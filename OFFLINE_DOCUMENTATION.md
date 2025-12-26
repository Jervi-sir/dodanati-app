# Offline Functionality Documentation

## Overview

Your Dodanati app now has comprehensive offline support with automatic data caching, queuing, and synchronization capabilities. This enables users to continue using the app and reporting hazards even without an internet connection.

## Features

### 1. **Automatic Data Caching**
- **Hazard Data**: Fetched hazard data is automatically cached in AsyncStorage
- **Cache TTL**: Cached data expires after 1 hour (configurable)
- **Smart Loading**: App loads cached data when offline or when cache is still valid
- **Auto-refresh**: When online, data automatically refreshes on map movements

### 2. **Network Status Detection**
- Real-time network connectivity monitoring
- Visual indicator showing online/offline status
- Automatic behavior adaptation based on connection state

### 3. **Offline Report Queuing**
- **Automatic Queuing**: Reports submitted offline are automatically queued
- **Persistent Storage**: Queued reports survive app restarts (stored in AsyncStorage)
- **Auto-expiration**: Queued items older than 24 hours are automatically removed
- **Visual Feedback**: Users see a banner showing the number of queued reports

### 4. **Smart Sync System**
- **Auto-prompt**: When coming back online with queued reports, users get a popup
- **Manual Sync**: Users can tap the orange banner to open sync dialog
- **Bulk Sync**: All queued reports sync in a single API call (efficient!)
- **Error Handling**: Failed syncs are reported, successful ones are confirmed

## Implementation Details

### File Structure

```
dodanati-app/
├── hooks/
│   └── use-network-status.ts          # Network connectivity hook
├── stores/
│   └── offline-queue-store.ts         # Zustand store for offline queue
├── components/
│   └── offline-indicator.tsx          # Visual network status indicator
├── screens/
│   └── sheets/
│       └── sync-queue-sheet.tsx       # Sync confirmation dialog
└── contexts/
    └── 5-hazard-context.tsx           # Enhanced with offline support
```

### Key Components

#### 1. **Network Status Hook** (`hooks/use-network-status.ts`)
```typescript
const { isConnected, isOnline, isInternetReachable } = useNetworkStatus();
```
- Monitors real-time connection status
- Distinguishes between connected vs. internet reachable

#### 2. **Offline Queue Store** (`stores/offline-queue-store.ts`)
```typescript
const { queue, addToQueue, removeFromQueue, loadQueue, clearQueue } = useOfflineQueueStore();
```
- Zustand store with AsyncStorage persistence
- Manages queued hazard reports
- Auto-expires old items (24 hours)

#### 3. **Offline Indicator** (`components/offline-indicator.tsx`)
- Animated status banner at top of screen
- Shows when offline OR when reports are queued
- Tap to open sync dialog (when online with queued items)
- Red banner: Offline
- Orange banner: Online with queued items

#### 4. **Sync Queue Sheet** (`screens/sheets/sync-queue-sheet.tsx`)
- Modal showing all queued reports
- **Bulk sync** for all items in one API call
- Shows timestamp, category, and severity for each report
- "Later" option to dismiss without syncing

### API Integration

#### Bulk Sync Endpoint

The app uses the efficient bulk API endpoint:

**Endpoint**: `POST /api/v1/hazards/bulk`

**Request Format**:
```json
{
  "device_uuid": "...",
  "platform": "ios|android",
  "app_version": "1.0.0",
  "locale": "fr-DZ",
  "items": [
    {
      "road_hazard_category_id": 1,
      "severity": 3,
      "note": "Optional note",
      "lat": 36.123,
      "lng": 3.456,
      "client_ref": "temp_123456_random"
    }
  ]
}
```

**Response Format**:
```json
{
  "data": [
    { "id": 1, "lat": 36.123, "lng": 3.456, ... }
  ],
  "meta": {
    "created_count": 5,
    "failed_count": 0,
    "merged_count": 2
  }
}
```

#### Benefits of Bulk API
- ✅ Single network request (faster)
- ✅ Atomic operation (all or nothing)
- ✅ Reduced server load
- ✅ Better error handling
- ✅ Client reference tracking

### Storage Keys

```typescript
STORAGE_KEY_HAZARDS = 'offline_hazards_cache_v1'         // Cached hazard points
STORAGE_KEY_CLUSTERS = 'offline_hazard_clusters_cache_v1' // Cached clusters
STORAGE_KEY_CACHE_META = 'offline_cache_metadata_v1'     // Cache timestamp
QUEUE_STORAGE_KEY = 'offline_hazard_queue_v1'            // Queued reports
```

### Configuration

#### Cache TTL (Time To Live)
Located in `contexts/5-hazard-context.tsx`:
```typescript
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
```

#### Queue Expiration
Located in `stores/offline-queue-store.ts`:
```typescript
const oneDay = 24 * 60 * 60 * 1000; // 24 hours
```

## User Experience Flow

### Scenario 1: Going Offline
1. User loses internet connection
2. Red "Mode hors ligne" banner appears at top
3. Map stops fetching new data, shows cached data
4. Any hazard reports are queued instead of submitted

### Scenario 2: Reporting While Offline
1. User reports a hazard (via form or quick report)
2. Report is added to offline queue
3. Success message: "Signalement mis en file d'attente"
4. Orange banner shows count of queued items

### Scenario 3: Coming Back Online
1. Device reconnects to internet
2. If queued reports exist, sync dialog appears after 1 second
3. User sees list of pending reports with details
4. User can:
   - Tap "Synchroniser" to sync all reports
   - Tap "Plus tard" to sync later
   - Tap the orange banner anytime to reopen dialog

### Scenario 4: Manual Sync (Bulk)
1. User taps orange banner showing queued items
2. Sync dialog opens
3. User reviews pending reports
4. Taps "Synchroniser"
5. **All reports sync in one bulk API call** (fast & efficient!)
6. Success/failure feedback shown
7. Successfully synced reports removed from queue

## API Integration

### Endpoints Used

The offline system works with your Laravel API:
- `POST /api/v1/hazards/store` - Submit single hazard report
- `POST /api/v1/hazards/bulk` - **Bulk submit queued reports** (sync)
- `GET /api/v1/hazards/nearby` - Fetch nearby hazards

### Offline Behavior

**When Online:**
- Normal API calls
- Immediate server submission
- Real-time data refresh

**When Offline:**
- Skip API calls for fetching
- Use cached data
- Queue submissions
- Show appropriate UI feedback

## Best Practices

### For Users
1. **Check the banner**: Always visible when offline or with pending items
2. **Sync regularly**: Don't let queued items accumulate
3. **Review before sync**: Check queued items in sync dialog before submitting

### For Developers
1. **Don't modify storage keys**: Changing them will lose cached/queued data
2. **Test offline scenarios**: Airplane mode testing is essential
3. **Handle edge cases**: Network flapping, partial connectivity
4. **Monitor cache size**: Large datasets may need pagination

## Troubleshooting

### Reports not syncing?
- Check network connection
- Open sync dialog manually via orange banner
- Check console for sync errors
- Verify bulk API endpoint is available

### Cache not updating?
- Wait for cache TTL to expire (1 hour)
- Pull down to refresh (if implemented)
- Force close and reopen app

### Queue growing too large?
- Old items (>24 hours) auto-delete
- Manually sync to clear queue
- Check AsyncStorage capacity

## Future Enhancements

Potential improvements:
1. **Background sync**: Auto-sync when connection restored
2. **Conflict resolution**: Handle reports for same location
3. **Partial sync**: Retry failed items only
4. **Cache management**: Clear old cache manually
5. **Sync logs**: History of sync operations
6. **Offline maps**: Cache map tiles for offline viewing
7. **Smart refresh**: Only refresh visible map area

## Technical Notes

### Performance
- AsyncStorage operations are async (non-blocking)
- Cache checks happen on mount (minimal impact)
- **Bulk sync uses single API call** (much faster than individual requests)
- Includes client reference tracking for debugging

### Limitations
- No offline support for user authentication
- Categories must be loaded online (cached after first load)
- Map tiles require connection (Google Maps limitation)
- 24-hour limit on queued items

### Testing

Test scenarios:
```bash
# Test offline mode
1. Enable airplane mode
2. Try to submit report
3. Verify queue storage
4. Disable airplane mode
5. Check sync dialog appears

# Test cache expiry
1. Set CACHE_TTL to 5000 (5 seconds)
2. Load data
3. Wait 5 seconds
4. Move map
5. Verify fresh fetch

# Test queue persistence
1. Queue some reports offline
2. Force close app
3. Reopen app
4. Verify queue restored
```

## Dependencies

Required packages (already installed):
- `@react-native-async-storage/async-storage` - Persistent storage
- `@react-native-community/netinfo` - Network detection
- `zustand` - State management
- `react-native-actions-sheet` - Bottom sheets

## Summary

Your app now provides a seamless offline experience:
- ✅ Cached data for offline viewing
- ✅ Queue reports when offline
- ✅ Automatic sync prompts
- ✅ Visual status indicators
- ✅ Persistent storage across app restarts
- ✅ Smart cache management with TTL
- ✅ User-friendly sync interface

Users can now use Dodanati anywhere, anytime, with or without internet!
