<?php

/**
 * Updated Laravel Backend Controller Method
 * 
 * This is an updated version of your nearby() method that supports BOTH:
 * 1. Viewport-based queries (using minLat, maxLat, minLng, maxLng)
 * 2. Radius-based queries (fallback for backward compatibility)
 * 
 * Place this in your RoadHazardController or similar controller.
 */

public function nearby(Request $request)
{
    $data = $request->validate([
        'lat'       => 'required|numeric|between:-90,90',
        'lng'       => 'required|numeric|between:-180,180',
        'radius_km' => 'nullable|numeric|min:0.1|max:500',
        'zoom'      => 'nullable|integer|min:0|max:22',
        'mode'      => 'nullable|in:points,clusters,auto',
        'limit'     => 'nullable|integer|min:1|max:5000',
        // NEW: viewport bounds
        'minLat'    => 'nullable|numeric|between:-90,90',
        'maxLat'    => 'nullable|numeric|between:-90,90',
        'minLng'    => 'nullable|numeric|between:-180,180',
        'maxLng'    => 'nullable|numeric|between:-180,180',
    ]);

    $lat    = (float) $data['lat'];
    $lng    = (float) $data['lng'];
    $zoom   = (int) ($data['zoom'] ?? 15);
    $mode   = $data['mode'] ?? 'auto';

    $pointsLimit   = min((int) ($data['limit'] ?? 1000), 5000);
    $clustersLimit = 40;

    // Determine query method: viewport bounds vs radius
    $useViewport = isset($data['minLat']) && isset($data['maxLat']) 
                && isset($data['minLng']) && isset($data['maxLng']);

    if ($useViewport) {
        // Viewport-based query
        $minLat = (float) $data['minLat'];
        $maxLat = (float) $data['maxLat'];
        $minLng = (float) $data['minLng'];
        $maxLng = (float) $data['maxLng'];

        // Create a bounding box polygon for PostGIS
        // Format: POLYGON((lng1 lat1, lng2 lat2, lng3 lat3, lng4 lat4, lng1 lat1))
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

        $metaInfo = [
            'viewport' => [
                'minLat' => $minLat,
                'maxLat' => $maxLat,
                'minLng' => $minLng,
                'maxLng' => $maxLng,
            ],
        ];
    } else {
        // Radius-based query (fallback)
        $radius = (float) ($data['radius_km'] ?? 10.0);
        $radiusMeters = $radius * 1000.0;

        $baseQuery = RoadHazard::query()
            ->active()
            ->whereNotNull('geog')
            ->whereRaw(
                "ST_DWithin(geog, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?)",
                [$lng, $lat, $radiusMeters]
            );

        $metaInfo = [
            'radius_km' => $radius,
        ];
    }

    $totalCount = (clone $baseQuery)->count();

    if ($mode === 'auto') {
        $mode = ($zoom >= 14 || $totalCount <= 400) ? 'points' : 'clusters';
    }

    if ($mode === 'clusters') {
        $cellDeg = match (true) {
            $zoom <= 5  => 2.0,
            $zoom <= 6  => 1.0,
            $zoom <= 7  => 0.5,
            $zoom <= 8  => 0.25,
            $zoom <= 9  => 0.15,
            $zoom <= 10 => 0.10,
            $zoom <= 11 => 0.05,
            $zoom <= 12 => 0.02,
            $zoom <= 13 => 0.01,
            default     => 0.005,
        };

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
        } else {
            $radiusMeters = $radius * 1000.0;
            $clustersQuery->whereRaw(
                "ST_DWithin(geog, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?)",
                [$lng, $lat, $radiusMeters]
            );
        }

        $clusters = $clustersQuery
            ->groupByRaw("ST_SnapToGrid(geog::geometry, ?)", [$cellDeg])
            ->limit($clustersLimit)
            ->get()
            ->map(fn ($r) => [
                'lat'   => (float) $r->lat,
                'lng'   => (float) $r->lng,
                'count' => (int) $r->count,
            ]);

        return response()->json([
            'mode' => 'clusters',
            'meta' => array_merge($metaInfo, [
                'total_in_viewport' => $totalCount,
                'zoom'              => $zoom,
                'cell_deg'          => $cellDeg,
                'returned_clusters' => $clusters->count(),
                'limit'             => $clustersLimit,
            ]),
            'data' => $clusters,
        ]);
    }

    $deviceId = (int) Auth::id();

    $hazards = (clone $baseQuery)
        ->with(['category:id,name_en,name_fr,name_ar,slug,icon'])
        ->select([
            'id',
            'road_hazard_category_id',
            'device_id',
            'severity',
            'note',
            'lat',
            'lng',
            'reports_count',
            'last_reported_at',
            'created_at',
            'updated_at',
        ])
        ->selectRaw('CASE WHEN device_id = ? THEN 1 ELSE 0 END as is_mine', [$deviceId])
        ->orderByDesc('reports_count')
        ->orderByDesc('id')
        ->limit($pointsLimit)
        ->get();

    return response()->json([
        'mode' => 'points',
        'meta' => array_merge($metaInfo, [
            'returned_count'    => $hazards->count(),
            'total_in_viewport' => $totalCount,
            'zoom'              => $zoom,
            'limit'             => $pointsLimit,
        ]),
        'data' => $hazards,
    ]);
}
