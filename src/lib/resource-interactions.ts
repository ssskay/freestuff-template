/**
 * Client-side resource interactions: upvoting and issue reporting.
 *
 * Single source for behavior shared across every page. Import once:
 *   import { initResourceInteractions } from '../lib/resource-interactions';
 *   initResourceInteractions();
 *
 * Resource identity is the stable slug carried on `data-resource-id`
 * (see catalog.ts). Upvote/report calls pass that slug straight through.
 */

import { getFingerprint } from './fingerprint';
import { upvoteResource, removeUpvote, getUserVotes, reportIssue } from './supabase';
import type { IssueType } from '../site.config';

/** Show a transient inline status message via the global live region. */
function toast(message: string): void {
  const region = document.getElementById('toast-region');
  if (!region) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  region.appendChild(el);
  window.setTimeout(() => el.remove(), 4000);
}

export function initResourceInteractions(): void {
  const fingerprint = getFingerprint();

  // Reflect the user's existing votes in the UI.
  getUserVotes(fingerprint)
    .then((votedIds) => {
      votedIds.forEach((id) => {
        const btn = document.querySelector(
          `button.upvote-btn[data-resource-id="${CSS.escape(id)}"]`
        ) as HTMLButtonElement | null;
        if (btn) {
          btn.dataset.voted = 'true';
          btn.setAttribute('aria-pressed', 'true');
        }
      });
    })
    .catch((error) => console.error('Error loading vote state:', error));

  // Upvote / remove-upvote.
  document.addEventListener('click', async (e) => {
    const button = (e.target as HTMLElement).closest('.upvote-btn') as HTMLButtonElement | null;
    if (!button) return;

    e.preventDefault();
    const resourceId = button.dataset.resourceId;
    if (!resourceId) return;

    const hasVoted = button.dataset.voted === 'true';
    button.disabled = true;

    try {
      const result = hasVoted
        ? await removeUpvote(resourceId, fingerprint)
        : await upvoteResource(resourceId, fingerprint);

      if (result.success) {
        const nowVoted = !hasVoted;
        button.dataset.voted = nowVoted ? 'true' : 'false';
        button.setAttribute('aria-pressed', nowVoted ? 'true' : 'false');
        const countSpan = button.querySelector('.upvote-count') as HTMLSpanElement | null;
        if (countSpan) countSpan.textContent = result.upvotes.toString();
      } else {
        console.warn('Vote action failed:', result.message);
      }
    } catch (error) {
      console.error('Error toggling vote:', error);
    } finally {
      button.disabled = false;
    }
  });

  // --- Report menu: accessible disclosure with focus + keyboard support ---
  let openTrigger: HTMLButtonElement | null = null;
  let openMenu: HTMLElement | null = null;

  function closeMenu(returnFocus: boolean): void {
    if (!openMenu || !openTrigger) return;
    openMenu.hidden = true;
    openTrigger.setAttribute('aria-expanded', 'false');
    const trigger = openTrigger;
    openMenu = null;
    openTrigger = null;
    if (returnFocus) trigger.focus();
  }

  function openMenuFor(trigger: HTMLButtonElement): void {
    const id = trigger.getAttribute('aria-controls');
    const menu = id ? document.getElementById(id) : null;
    if (!menu) return;
    if (openMenu && openMenu !== menu) closeMenu(false);
    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    openTrigger = trigger;
    openMenu = menu;
    const first = menu.querySelector('.report-option') as HTMLButtonElement | null;
    first?.focus();
  }

  document.addEventListener('click', (e) => {
    const trigger = (e.target as HTMLElement).closest('.report-btn') as HTMLButtonElement | null;
    if (!trigger) return;
    e.preventDefault();
    e.stopPropagation();
    if (openTrigger === trigger) {
      closeMenu(true);
    } else {
      openMenuFor(trigger);
    }
  });

  // Close on outside click or Escape.
  document.addEventListener('click', (e) => {
    if (openMenu && !(e.target as HTMLElement).closest('.report-wrapper')) {
      closeMenu(false);
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openMenu) {
      e.preventDefault();
      closeMenu(true);
    }
  });

  // Submit a report (single insert, no email harvest). Confirmation via toast.
  document.addEventListener('click', async (e) => {
    const reportOption = (e.target as HTMLElement).closest('.report-option') as HTMLButtonElement | null;
    if (!reportOption) return;

    e.preventDefault();
    e.stopPropagation();

    const issueType = reportOption.dataset.issue as IssueType | undefined;
    const menu = reportOption.closest('.report-dropdown') as HTMLElement | null;
    const resourceId = menu?.dataset.resourceId;
    if (!resourceId || !issueType || !menu) return;

    const allOptions = menu.querySelectorAll('.report-option') as NodeListOf<HTMLButtonElement>;
    allOptions.forEach((opt) => (opt.disabled = true));
    closeMenu(true);

    try {
      const result = await reportIssue(resourceId, issueType);
      toast(
        result.success
          ? 'Thanks — flagged for review. 🌲'
          : 'Something went wrong. Please try again.'
      );
      if (!result.success) console.error('Report submission error:', result.error);
    } catch (error) {
      toast('Something went wrong. Please try again.');
      console.error('Error submitting report:', error);
    } finally {
      allOptions.forEach((opt) => (opt.disabled = false));
    }
  });
}
