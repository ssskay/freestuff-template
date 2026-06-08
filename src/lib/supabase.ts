/**
 * Supabase Client for Free Stuff @ Dartmouth
 * Typed helpers for database operations.
 *
 * Public-facing resource identity is the stable slug (see catalog.ts). The
 * upvote/report RPCs accept either the slug or the internal UUID and resolve it
 * server-side, so the client never needs to know the UUID.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { ISSUE_TYPES, type IssueType } from '../site.config';

// Environment variables (set these in .env)
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// For Node.js environments (build time), import ws for WebSocket support
let WebSocket: any;
if (typeof window === 'undefined') {
  try {
    WebSocket = (await import('ws')).default;
  } catch (e) {
    // ws not available, but that's okay
    console.warn('ws package not available for WebSocket support');
  }
}

// Create Supabase client (with fallback for build time).
// If env vars are missing, the client is created but helpers short-circuit via
// isSupabaseConfigured() rather than issuing requests to a placeholder host.
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: false, // Disable session persistence for server-side
    },
    realtime: WebSocket ? { transport: WebSocket } : undefined,
  }
);

type ResourceRow = Database['public']['Tables']['resources']['Row'];
type PendingResource = Database['public']['Tables']['pending_resources']['Row'];

// Validation bounds for user-submitted content.
const LIMITS = {
  name: 200,
  description: 2000,
  url: 2000,
  notes: 2000,
  email: 254,
  details: 2000,
} as const;

/** Helper to check if Supabase is configured. */
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey);
}

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Fetch all active resources (including their slug) ordered by name.
 * Returns raw rows; callers normalize via catalog.ts.
 */
export async function getAllResources(): Promise<ResourceRow[]> {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, returning empty array');
    return [];
  }

  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching resources:', error);
    return [];
  }

  return data || [];
}

/** Fetch a single resource by slug. */
export async function getResourceBySlug(slug: string): Promise<ResourceRow | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('Error fetching resource:', error);
    return null;
  }

  return data;
}

/** Check if a user has already voted for a resource (by slug or UUID). */
export async function hasUserVoted(resourceId: string, fingerprint: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const votes = await getUserVotes(fingerprint);
  return votes.includes(resourceId);
}

/**
 * Upvote a resource. `resourceId` may be the slug or the internal UUID; the
 * database function resolves it. Returns the new count.
 */
export async function upvoteResource(
  resourceId: string,
  fingerprint: string
): Promise<{ success: boolean; upvotes: number; message: string }> {
  const { data, error } = await supabase.rpc('upvote_resource', {
    p_id: resourceId,
    p_fingerprint: fingerprint,
  });

  if (error) {
    console.error('Error upvoting resource:', error);
    return { success: false, upvotes: 0, message: 'Error recording vote' };
  }

  const result = Array.isArray(data) ? data[0] : data;
  return result || { success: false, upvotes: 0, message: 'Unknown error' };
}

/** Remove an upvote from a resource (by slug or UUID). */
export async function removeUpvote(
  resourceId: string,
  fingerprint: string
): Promise<{ success: boolean; upvotes: number; message: string }> {
  const { data, error } = await supabase.rpc('remove_upvote', {
    p_id: resourceId,
    p_fingerprint: fingerprint,
  });

  if (error) {
    console.error('Error removing upvote:', error);
    return { success: false, upvotes: 0, message: 'Error removing vote' };
  }

  const result = Array.isArray(data) ? data[0] : data;
  return result || { success: false, upvotes: 0, message: 'Unknown error' };
}

/**
 * Get the slugs (public ids) a user has voted for, for reflecting vote state.
 * Joins through to the resource slug so it matches data-resource-id in the DOM.
 */
export async function getUserVotes(fingerprint: string): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('votes')
    .select('resource_id, resources(slug)')
    .eq('fingerprint', fingerprint);

  if (error) {
    console.error('Error fetching user votes:', error);
    return [];
  }

  return (data || []).map((vote: any) => vote.resources?.slug || vote.resource_id);
}

/**
 * Submit a new resource to the moderation queue. Validates and trims input.
 */
export async function submitResource(resource: {
  name: string;
  description: string;
  url: string;
  category: string;
  eligibility: string[];
  notes?: string;
  submitted_by?: string;
}): Promise<{ success: boolean; message: string; id?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, message: 'Submissions are temporarily unavailable.' };
  }

  const name = resource.name?.trim() || '';
  const description = resource.description?.trim() || '';
  const url = resource.url?.trim() || '';
  const notes = resource.notes?.trim() || '';
  const submittedBy = resource.submitted_by?.trim() || '';

  if (!name || name.length > LIMITS.name) {
    return { success: false, message: 'Please provide a name (under 200 characters).' };
  }
  if (!description || description.length > LIMITS.description) {
    return { success: false, message: 'Please provide a description (under 2000 characters).' };
  }
  if (!isValidHttpUrl(url) || url.length > LIMITS.url) {
    return { success: false, message: 'Please provide a valid http(s) URL.' };
  }
  if (!resource.eligibility?.length) {
    return { success: false, message: 'Please select at least one eligibility option.' };
  }
  if (notes.length > LIMITS.notes) {
    return { success: false, message: 'Notes are too long (under 2000 characters).' };
  }
  if (submittedBy.length > LIMITS.email) {
    return { success: false, message: 'That email looks too long.' };
  }

  const { data, error } = await supabase
    .from('pending_resources')
    .insert({
      name,
      description,
      url,
      category: resource.category,
      eligibility: resource.eligibility,
      notes: notes || null,
      submitted_by: submittedBy || 'anonymous',
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error submitting resource:', error);
    return { success: false, message: 'Failed to submit resource.' };
  }

  return { success: true, message: 'Resource submitted successfully', id: data.id };
}

/** Fetch pending resources (admin view — requires service-role access). */
export async function getPendingResources(): Promise<PendingResource[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('pending_resources')
    .select('*')
    .order('submitted_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending resources:', error);
    return [];
  }

  return data || [];
}

/**
 * Submit a report about a resource issue. Routes through a SECURITY DEFINER
 * function so the reports table is not writable/readable directly by anon.
 * `resourceId` may be the slug or the internal UUID.
 */
export async function reportIssue(
  resourceId: string,
  issueType: IssueType,
  details?: string,
  email?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Reporting is temporarily unavailable.' };
  }
  if (!ISSUE_TYPES.includes(issueType)) {
    return { success: false, error: 'Invalid issue type.' };
  }

  const trimmedDetails = details?.trim().slice(0, LIMITS.details) || null;
  const trimmedEmail = email?.trim().slice(0, LIMITS.email) || null;

  const { error } = await supabase.rpc('report_issue', {
    p_id: resourceId,
    p_issue_type: issueType,
    p_details: trimmedDetails,
    p_email: trimmedEmail,
  });

  if (error) {
    // Generic message to the caller; details only to the console.
    console.error('Error submitting report:', error);
    return { success: false, error: 'Could not submit report.' };
  }

  return { success: true };
}

/**
 * Opt in to the newsletter. Routes through a SECURITY DEFINER function so the
 * subscriber list is not readable/writable directly by anon. `source` records
 * where the signup happened (e.g. "home", "for-students").
 */
export async function subscribeEmail(
  email: string,
  source?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Signups are temporarily unavailable.' };
  }
  const trimmed = email?.trim() || '';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed) || trimmed.length > LIMITS.email) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  const { error } = await supabase.rpc('subscribe_email', {
    p_email: trimmed,
    p_source: source ? source.slice(0, 100) : null,
  });

  if (error) {
    console.error('Error subscribing:', error);
    return { success: false, error: 'Could not sign you up. Please try again.' };
  }

  return { success: true };
}
