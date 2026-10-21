/**
 * Minimal, safe Markdown renderer for blog posts: escapes HTML first, then applies
 * a small set of block and inline rules. Output is safe to inject.
 */
function escape(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function inline(text: string): string {
  return escape(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g, '<a href="$2" rel="noopener noreferrer">$1</a>');
}

export function renderMarkdown(source: string): string {
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trimEnd();
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    const bullet = line.match(/^[-*]\s+(.*)$/);
    const numbered = line.match(/^\d+\.\s+(.*)$/);
    if (heading) {
      closeList();
      const level = heading[1]!.length + 1;
      out.push(`<h${level}>${inline(heading[2]!)}</h${level}>`);
    } else if (bullet) {
      if (list !== 'ul') {
        closeList();
        out.push('<ul>');
        list = 'ul';
      }
      out.push(`<li>${inline(bullet[1]!)}</li>`);
    } else if (numbered) {
      if (list !== 'ol') {
        closeList();
        out.push('<ol>');
        list = 'ol';
      }
      out.push(`<li>${inline(numbered[1]!)}</li>`);
    } else if (line === '') {
      closeList();
    } else {
      closeList();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  return out.join('\n');
}
