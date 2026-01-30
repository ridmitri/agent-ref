import { LineRange } from './selection';

export type ReferenceFormat = 'universal' | 'claude' | 'abs' | 'markdown';

export type FormatConfig = {
  format: ReferenceFormat;
  path: string;
  range: LineRange;
};

/**
 * Format file reference according to specified format
 */
export function formatRef(config: FormatConfig): string {
  const { format, path, range } = config;

  const rangeStr = formatRange(range);

  switch (format) {
    case 'universal':
      return `${path}:${rangeStr}`;

    case 'claude':
      return `@${path}#${rangeStr}`;

    case 'abs':
      return `${path}:${rangeStr}`;

    case 'markdown':
      return `\`${path}:${rangeStr}\``;

    default:
      return `${path}:${rangeStr}`;
  }
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
