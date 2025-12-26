# Offline Feature - Quick Reference

## What's New? 🎯

Your Dodanati app now works **100% offline**!

## Key Features

### 📱 Visual Indicators

**Red Banner** = Offline Mode
```
🔴 Mode hors ligne
```

**Orange Banner** = Pending Sync
```
🟠 3 signalements en attente
   Appuyez pour synchroniser
```

### 💾 What's Cached?

- ✅ Hazard markers (1 hour)
- ✅ Map clusters (1 hour)  
- ✅ Category data
- ❌ Map tiles (Google Maps limitation)

### 📤 Offline Reporting

**What happens when you report offline:**
1. Report saved to queue ✅
2. Stored in AsyncStorage ✅
3. Survives app restart ✅
4. Orange banner shows count ✅
5. Auto-expires after 24h ✅

### 🔄 Sync Behavior

**Automatic:**
- Popup appears when back online (if queue not empty)
- Shows 1 second after connection restored

**Manual:**
- Tap orange banner anytime
- Opens sync dialog
- Review all pending reports
- Sync all or dismiss

## User Actions

### Submit Report Offline
```
1. Fill hazard form → Submit
2. See: "Signalement mis en file d'attente" ✅
3. Orange banner appears
```

### Sync When Online
```
1. Tap orange banner
2. Review pending reports
3. Tap "Synchroniser"
4. Wait for confirmation
```

### Quick Reports Offline
```
Speed bump or pothole quick report while offline:
→ Automatically queued
→ "Dos-d'âne mis en file d'attente" message
```

## File Locations

```
📁 Key Files:
- hooks/use-network-status.ts       → Detect online/offline
- stores/offline-queue-store.ts     → Manage queue
- components/offline-indicator.tsx  → Status banner
- screens/sync-queue-sheet.tsx      → Sync dialog
- contexts/5-hazard-context.tsx     → Core logic
```

## Configuration

```typescript
// Cache duration (1 hour)
CACHE_TTL = 60 * 60 * 1000

// Queue expiration (24 hours)
queueExpiry = 24 * 60 * 60 * 1000

// Sync prompt delay
syncDelay = 1000ms
```

## Testing Checklist

- [ ] Enable airplane mode
- [ ] Submit a hazard report
- [ ] See "mis en file d'attente"
- [ ] Orange banner appears
- [ ] Disable airplane mode
- [ ] Sync dialog auto-appears
- [ ] Tap "Synchroniser"
- [ ] Reports sync successfully
- [ ] Banner disappears

## Common Issues

**Q: Sync dialog not appearing?**
→ Tap the orange banner manually

**Q: Old reports still in queue?**
→ They auto-delete after 24 hours

**Q: Map not loading offline?**
→ Map tiles need connection (cached hazards still show)

**Q: Lost queued reports?**
→ Queue persists in AsyncStorage (survives app restart)

## Benefits

✅ Works without internet
✅ No data loss
✅ Smart caching (1 hour)
✅ Auto-sync prompts
✅ Persistent queue
✅ Visual feedback
✅ Battery friendly

---

**TL;DR:** Report hazards anywhere, sync when connected! 🎉
