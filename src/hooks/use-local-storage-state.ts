'use client';

/**
 * This file used to implement localStorage-backed state.
 *
 * As of the 2026-04-18 migration, all data is cloud-synced per-tenant via
 * the `cloud_state` table. The import path is kept unchanged so every
 * existing page keeps working without edits — we just re-export the cloud
 * implementations under the old names.
 *
 * For structured entity lists (customers, vendors, etc.), use `useCrudApi`
 * against a dedicated API route / table instead. `useCrudList` via this
 * file is fine for small secondary lists where a JSON blob per-tenant is
 * all you need.
 */

export { useCloudState as useLocalStorageState } from './use-cloud-state';
export { useCloudCrudList as useCrudList } from './use-cloud-state';
