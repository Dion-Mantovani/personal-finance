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
    <div class="px-6 py-10 text-center ${className}">
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-soft text-primary">
        ${iconHtml}
      </div>
      <p class="mt-4 text-sm font-extrabold text-primary">${escapeHtml(title)}</p>
      ${
        description
          ? `<p class="mx-auto mt-1 max-w-[260px] text-[11px] font-medium leading-relaxed text-muted-foreground">${escapeHtml(description)}</p>`
          : ''
      }
      ${actionHtml ? `<div class="mt-4 flex justify-center">${actionHtml}</div>` : ''}
    </div>
  `;
}
