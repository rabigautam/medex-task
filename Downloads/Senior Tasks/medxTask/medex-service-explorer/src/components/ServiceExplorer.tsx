
"use client";

import type {
    Filters
} from "@/types/medex";

import
    {
        defaultFilters, readFilters
    } from "@/lib/filtering";


// ============================================================================
// CONFIGURATION
// ============================================================================
const PAGE_SIZE = 12;


function normalizeFilters(searchParams?: URLSearchParams): Filters {
  return {
    ...defaultFilters,
    ...(searchParams ? readFilters(searchParams) : {}),
  } as Filters;
}

