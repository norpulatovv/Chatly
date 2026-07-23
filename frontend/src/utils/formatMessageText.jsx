const TOKEN_REGEX = /(\*\*[^*\n]+\*\*)|(`[^`\n]+`)|(\*[^*\n]+\*)|(_[^_\n]+_)|(@[a-zA-Z0-9_]+)|(https?:\/\/[^\s<>"']+)/g;

function mentionStyle(isOwn) {
  return {
    color: isOwn ? '#fff' : '#6366f1',
    fontWeight: 600,
    background: isOwn ? 'rgba(255,255,255,0.18)' : 'rgba(99,102,241,0.12)',
    borderRadius: 4,
    padding: '0 2px'
  };
}

export function formatMessageText(text, isOwn) {
  if (!text) return null;
  const nodes = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of text.matchAll(TOKEN_REGEX)) {
    const [full, bold, code, italicStar, italicUnderscore, mention, url] = match;
    const start = match.index;

    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start));
    }

    if (bold) {
      nodes.push(<strong key={key++}>{bold.slice(2, -2)}</strong>);
    } else if (code) {
      nodes.push(
        <code
          key={key++}
          style={{
            background: isOwn ? 'rgba(255,255,255,0.2)' : 'rgba(128,128,128,0.18)',
            padding: '1px 5px',
            borderRadius: 4,
            fontSize: '0.9em',
            fontFamily: 'Menlo, Consolas, monospace'
          }}
        >
          {code.slice(1, -1)}
        </code>
      );
    } else if (italicStar) {
      nodes.push(<em key={key++}>{italicStar.slice(1, -1)}</em>);
    } else if (italicUnderscore) {
      nodes.push(<em key={key++}>{italicUnderscore.slice(1, -1)}</em>);
    } else if (mention) {
      nodes.push(
        <span key={key++} style={mentionStyle(isOwn)}>{mention}</span>
      );
    } else if (url) {
      nodes.push(
        <a
          key={key++}
          href={url}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            color: isOwn ? '#e0e7ff' : '#6366f1',
            textDecoration: 'underline',
            wordBreak: 'break-all'
          }}
        >
          {url}
        </a>
      );
    }

    lastIndex = start + full.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}
