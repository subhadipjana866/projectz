import { useState, useEffect } from 'react';

/**
 * Renders an <img>, but falls back to `fallback` when the src is missing or
 * fails to load (e.g. a broken/expired S3 URL) — so users never see the
 * browser's broken-image icon.
 *
 * Usage:
 *   <SafeImage src={url} alt="..." className="w-full h-full object-cover"
 *              fallback={<span>{initial}</span>} />
 */
export default function SafeImage({ src, alt = '', className = '', fallback = null, ...rest }) {
  const [failed, setFailed] = useState(false);

  // Reset when the source changes (e.g. list re-renders with a new item).
  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) return fallback;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      {...rest}
    />
  );
}
