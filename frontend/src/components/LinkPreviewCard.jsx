import { Link2 } from 'lucide-react';

export default function LinkPreviewCard({ preview, isOwn }) {
  if (!preview || (!preview.title && !preview.description && !preview.image)) return null;

  let hostname;
  try {
    hostname = new URL(preview.url).hostname.replace('www.', '');
  } catch {
    hostname = preview.url;
  }

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="hover-lift"
      style={{
        display: 'flex',
        flexDirection: preview.image ? 'column' : 'row',
        gap: 8,
        marginTop: 6,
        marginBottom: 2,
        textDecoration: 'none',
        borderRadius: 10,
        overflow: 'hidden',
        border: `1px solid ${isOwn ? 'rgba(255,255,255,0.25)' : 'rgba(128,128,128,0.2)'}`,
        background: isOwn ? 'rgba(255,255,255,0.08)' : 'rgba(128,128,128,0.06)',
        maxWidth: 300
      }}
    >
      {preview.image && (
        <img
          src={preview.image}
          alt=""
          style={{ width: '100%', maxHeight: 140, objectFit: 'cover', display: 'block' }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      )}
      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: 0.7 }}>
          <Link2 size={11} />
          <span style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.3 }}>{hostname}</span>
        </div>
        {preview.title && (
          <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {preview.title}
          </p>
        )}
        {preview.description && (
          <p style={{ fontSize: 12, margin: 0, opacity: 0.75, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {preview.description}
          </p>
        )}
      </div>
    </a>
  );
}
