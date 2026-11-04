import { escapeHtml } from './html';

export interface EmptyStateOptions {
  iconHtml: string;
  title: string;
  description?: string;
  actionHtml?: string;
  className?: string;
}

/**
 * Markup empty state yang seragam untuk semua list.
 * iconHtml & actionHtml dianggap markup tepercaya dari halaman.
 */
export function emptyStateHtml(options: EmptyStateOptions): string {
  const { iconHtml, title, description, actionHtml, className = '' } = options;

  return `
    <div class="rounded-2xl border border-dashed border-brand-border bg-white/60 px-5 py-7 text-center ${className}">
      <div class="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-brand-border/60 bg-brand-light text-text-secondary">
        ${iconHtml}
      </div>
      <p class="mt-3 text-sm font-bold text-brand-navy">${escapeHtml(title)}</p>
      ${
        description
          ? `<p class="mx-auto mt-1 max-w-[260px] text-[11px] leading-relaxed text-text-secondary">${escapeHtml(description)}</p>`
          : ''
      }
      ${actionHtml ? `<div class="mt-3.5 flex justify-center">${actionHtml}</div>` : ''}
    </div>
  `;
}
