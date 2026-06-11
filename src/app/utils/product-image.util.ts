const PLACEHOLDER = 'assets/img/placeholder.png';

function resolvePath(raw?: string | null, fallback = PLACEHOLDER): string {
  if (!raw?.trim()) return fallback;
  return raw;
}

export function resolveProductGalleryImage(product: any): string {
  if (product?.imagePath) return resolvePath(product.imagePath);
  const fromImages = product?.images?.[0];
  if (typeof fromImages === 'string') return resolvePath(fromImages);
  if (fromImages?.imagePath) return resolvePath(fromImages.imagePath);
  if (Array.isArray(product?.images) && typeof product.images[0] === 'string') {
    return resolvePath(product.images[0]);
  }
  return PLACEHOLDER;
}

export function hasOptionImage(option: any): boolean {
  return !!(option?.imagePath || option?.imageUrl || option?.image);
}

export function resolveOptionImagePath(
  option: any,
  fallback = PLACEHOLDER
): string {
  return resolvePath(
    option?.imagePath || option?.imageUrl || option?.image,
    fallback
  );
}

export function hasVariantImage(variant: any): boolean {
  return !!(variant?.imagePath || variant?.imageUrl || variant?.image);
}

export function resolveVariantImagePath(
  variant: any,
  fallback = ''
): string {
  const raw = variant?.imagePath || variant?.imageUrl || variant?.image;
  return resolvePath(raw, fallback || PLACEHOLDER);
}
