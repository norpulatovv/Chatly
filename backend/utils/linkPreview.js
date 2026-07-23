const URL_REGEX = /(https?:\/\/[^\s<>"']+)/i;

function extractFirstUrl(text) {
  if (!text) return null;
  const match = text.match(URL_REGEX);
  return match ? match[1].replace(/[.,!?)]+$/, '') : null;
}

function extractMeta(html, ...names) {
  for (const name of names) {
    const propRegex = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']*)["']`,
      'i'
    );
    const match = html.match(propRegex);
    if (match) return match[1];

    const reversedRegex = new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${name}["']`,
      'i'
    );
    const reversedMatch = html.match(reversedRegex);
    if (reversedMatch) return reversedMatch[1];
  }
  return null;
}

function decodeEntities(str) {
  if (!str) return str;
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function resolveUrl(base, maybeRelative) {
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return maybeRelative;
  }
}

async function fetchLinkPreview(rawUrl) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(rawUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ChatlyBot/1.0; +linkpreview)' }
    });
    clearTimeout(timeout);

    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return null;

    const reader = response.body?.getReader();
    let html = '';
    if (reader) {
      const decoder = new TextDecoder();
      let bytesRead = 0;
      const maxBytes = 200000;
      while (bytesRead < maxBytes) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        bytesRead += value.length;
      }
      try { await reader.cancel(); } catch { /* ignore */ }
    } else {
      html = await response.text();
    }

    const finalUrl = response.url || rawUrl;

    const title = decodeEntities(
      extractMeta(html, 'og:title', 'twitter:title') ||
      (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1]
    );
    const description = decodeEntities(
      extractMeta(html, 'og:description', 'twitter:description', 'description')
    );
    let image = extractMeta(html, 'og:image', 'twitter:image');
    if (image) image = resolveUrl(finalUrl, image);

    if (!title && !description && !image) return null;

    return {
      url: finalUrl,
      title: (title || '').trim().slice(0, 200),
      description: (description || '').trim().slice(0, 300),
      image: image || ''
    };
  } catch {
    return null;
  }
}

module.exports = { extractFirstUrl, fetchLinkPreview };
