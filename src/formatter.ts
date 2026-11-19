import { LineRange } from './selection';

export type FormatConfig = {
  path: string;
  range: LineRange;
};

/**
 * Format a file reference using the single absolute-path contract.
 */
export function formatRef(config: FormatConfig): string {
  return `${config.path}:${formatRange(config.range)}`;
}

/** Format rendered Markdown text with its backing source file, without a range. */
export function formatPreviewSelection(path: string, text: string): string {
  return `${path}:<selected_text>${text}</selected_text>`;
}

/**
 * Format line range with optional column information
 */
function formatRange(range: LineRange): string {
  const { start, end, startCol, endCol } = range;

  // Include columns if available
  if (startCol !== undefined && endCol !== undefined) {
    if (start === end) {
      return `${start}:${startCol}-${endCol}`;
    } else {
      return `${start}:${startCol}-${end}:${endCol}`;
    }
  }

  // Line-only format
  if (start === end) {
    return `${start}`;
  } else {
    return `${start}-${end}`;
  }
}
