// src/api/types.ts

/* ---------------------- Shared ---------------------- */

export type LangCode = 'en' | 'fr' | 'ar';

export type PlatformCode = 'ios' | 'android' | 'web' | string;

/* ---------------------- Device ---------------------- */

export interface Device {
  id: number;
  uuid: string;

  platform: string | null;
  app_version: string | null;
  push_token: string | null;
  push_token_synced_at: string | null;

  device_model: string | null;
  os_version: string | null;
  locale: string | null;

  submissions_count: number;
  last_seen_at: string | null;

  extra_data: Record<string, any> | null;

  created_at: string;
  updated_at: string;
}

/* ---------------------- Road Hazard Category ---------------------- */

// Raw category as stored in DB / normal index
export interface RoadHazardCategory {
  id: number;
  slug: string;

  name_en: string;
  name_fr: string;
  name_ar: string;

  icon: string | null;
  is_active: boolean;

  created_at: string;
  updated_at: string;
}

// Category shape returned by taxonomy endpoint
// /v1/taxonomy/road-hazard-categories
export interface RoadHazardCategoryTaxonomyItem {
  id?: number;
  slug?: string;
  label?: string;
  icon?: string | null;
  names?: {
    en: string;
    fr: string;
    ar: string;
  };
}

/* ---------------------- Road Hazard (canonical) ---------------------- */

export interface RoadHazard {
  id: number;
  road_hazard_category_id: number;
  device_id: number | null;

  severity: number;
  note: string | null;

  lat: number;
  lng: number;

  upvotes: number;
  downvotes: number;

  reports_count: number;
  last_reported_at: string | null;

  is_active: boolean;

  created_at: string;
  updated_at: string;

  // eager-loaded relations (optional)
  category?: RoadHazardCategory;
  device?: Device;
}

/* ---------------------- Road Hazard History (raw submissions) ---------------------- */

export interface RoadHazardHistory {
  id: number;

  road_hazard_id: number;
  road_hazard_category_id: number;
  device_id: number | null;

  severity: number;
  note: string | null;

  lat: number;
  lng: number;

  source_ip: string | null;
  user_agent: string | null;

  created_at: string;
  updated_at: string;

  // optional relations when loaded with()
  hazard?: RoadHazard;
  category?: RoadHazardCategory;
  device?: Device;
}

/* ---------------------- Device Activity Log ---------------------- */

export type DeviceActivityEvent =
  | 'app_open'
  | 'foreground'
  | 'background'
  | 'session_start'
  | 'session_end'
  | string;

export interface DeviceActivityLog {
  id: number;
  device_id: number;

  event: DeviceActivityEvent;
  occurred_at: string; // ISO datetime

  app_version: string | null;
  platform: string | null;
  locale: string | null;
  ip: string | null;

  meta: Record<string, any> | null;

  created_at: string;
  updated_at: string;

  device?: Device;
}

/* ---------------------- API payloads ---------------------- */

// What Expo sends when submitting a hazard
export interface CreateHazardPayload {
  device_uuid: string;
  road_hazard_category_id: number;

  severity?: number;
  note?: string;

  lat: number;
  lng: number;

  // device metadata (optional but recommended)
  platform?: PlatformCode;
  app_version?: string;
  device_model?: string;
  os_version?: string;
  locale?: string;
  push_token?: string;
}

// Response of POST /v1/hazards
export interface CreateHazardResponse {
  data: RoadHazard;
  meta: {
    merged: boolean;
    distance_m: number | null;
    history_id: number;
    reports_count: number;
    device_uuid: string;
    device_submissions_count: number;
  };
}

// GET /v1/hazards/nearby
export interface NearbyHazardsResponse {
  data: RoadHazard[];
}

// GET /v1/hazards (paginated list)
export interface PaginatedHazardsResponse {
  data: RoadHazard[];
  meta: {
    current_page: number;
    last_page: number;
    total: number;
  };
}

// GET /v1/road-hazard-histories
export interface PaginatedHazardHistoriesResponse {
  data: RoadHazardHistory[];
  meta: {
    current_page: number;
    last_page: number;
    total: number;
  };
}

/* ---------------------- Taxonomy API ---------------------- */

// GET /v1/taxonomy/road-hazard-categories
export interface RoadHazardCategoryTaxonomyResponse {
  data: RoadHazardCategoryTaxonomyItem[];
  meta: {
    lang: LangCode;
    active_only: boolean;
    fields: string[];
  };
}

/* ---------------------- Device Activity API ---------------------- */

// Payload for POST /v1/device-activity
export interface DeviceActivityPayload {
  device_uuid: string;
  event?: DeviceActivityEvent;

  platform?: PlatformCode;
  app_version?: string;
  device_model?: string;
  os_version?: string;
  locale?: string;

  meta?: Record<string, any>;
}

// Response for POST /v1/device-activity
export interface DeviceActivityResponse {
  data: {
    device_id: number;
    device_uuid: string;
    activity_log_id: number;
  };
}
