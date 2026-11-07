/**
 * Products shown under the "New" tab of the menu.
 *
 * The API has no creation date, so a product counts as new when its image was
 * uploaded to Cloudinary within `windowDays` (the `/v<unix-seconds>/` part of
 * the image URL) and its id is higher than every product whose image is older.
 * The id rule keeps old products whose photo was merely replaced out of the tab.
 */
export interface NewProductsConfig {
  windowDays: number;
  /** Slugs always shown as new, whatever their age. */
  pinned: string[];
  /** Slugs never shown as new. */
  hidden: string[];
}

export const NEW_PRODUCTS: NewProductsConfig = {
  windowDays: 30,
  pinned: ['scoop-cookie'],
  hidden: [],
};

const DAY_MS = 86_400_000;

function imageUploadedAt(imagePath: unknown): number | null {
  const match = /\/v(\d{9,11})\//.exec(String(imagePath ?? ''));
  return match ? Number(match[1]) * 1000 : null;
}

/** Newest first. */
export function pickNewProducts<T extends { id?: number; slug?: string; imagePath?: string }>(
  products: T[],
  config: NewProductsConfig = NEW_PRODUCTS,
  now = Date.now()
): T[] {
  const cutoff = now - config.windowDays * DAY_MS;
  const pinned = new Set(config.pinned);
  const hidden = new Set(config.hidden);

  let newestOldId = -Infinity;
  for (const p of products) {
    const uploadedAt = imageUploadedAt(p.imagePath);
    if (uploadedAt != null && uploadedAt < cutoff) {
      newestOldId = Math.max(newestOldId, Number(p.id) || 0);
    }
  }

  const seen = new Set<number | string>();
  return products
    .filter((p) => {
      const key = p.id ?? p.slug ?? '';
      if (seen.has(key)) return false;
      seen.add(key);
      if (p.slug && hidden.has(p.slug)) return false;
      if (p.slug && pinned.has(p.slug)) return true;
      const uploadedAt = imageUploadedAt(p.imagePath);
      return uploadedAt != null && uploadedAt >= cutoff && (Number(p.id) || 0) > newestOldId;
    })
    .sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
}
