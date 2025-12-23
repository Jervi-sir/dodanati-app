// src/sheets/register.ts
import { registerSheet } from "react-native-actions-sheet";
import { HazardReportSheet } from "./hazard-report-sheet";
import { HazardDetailSheet } from "./hazard-detail-sheet";
import { MapParamsSheet } from "./map-params-sheet";
import { HazardHistorySheet } from "./hazard-history-sheet";
import SyncQueueSheet from "./sync-queue-sheet";

registerSheet("hazard-report-sheet", HazardReportSheet);
registerSheet('hazard-detail-sheet', HazardDetailSheet);
registerSheet('hazard-history-sheet', HazardHistorySheet);
registerSheet('map-params-sheet', MapParamsSheet);
registerSheet('sync-queue-sheet', SyncQueueSheet);

export { };
