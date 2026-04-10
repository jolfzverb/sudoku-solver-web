/**
 * Convert a 0-indexed region id like "row-0", "col-6", "box-1-2"
 * into a human-readable 1-indexed label.
 */
export function formatRegion(id: string): string {
  const m = id.match(/^(row|col|box)-(\d+)(-(\d+))?$/);
  if (!m) return id;
  const type = m[1];
  const n1 = parseInt(m[2]) + 1;
  if (type === 'box' && m[4] !== undefined) {
    const n2 = parseInt(m[4]) + 1;
    return `box ${n1},${n2}`;
  }
  const label = type === 'col' ? 'column' : type;
  return `${label} ${n1}`;
}
