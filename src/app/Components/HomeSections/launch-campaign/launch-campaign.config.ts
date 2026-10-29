/**
 * Everything the launch campaign needs lives here; texts live under
 * `launchCampaign` in assets/i18n/{en,ar}.json.
 */
export interface LaunchCampaignConfig {
  enabled: boolean;
  /** Teaser + countdown before this moment, "available now" after it (Cairo time). */
  launchAt: string;
  /** Section disappears after this moment; null keeps it up. */
  hideAt: string | null;
  /** The only branch that sells the product. */
  branchId: number;
  /** Paths under src/assets. WebM first; MP4 is the fallback for older Safari. */
  video: { webm: string; mp4: string } | null;
  poster: string;
  gallery: string[];
  /** How long each photo stays before the slideshow moves on. */
  photoMs: number;
  /** Product name as used in /productdetails/:name once it exists in the backend. */
  productName: string;
}

export const LAUNCH_CAMPAIGN: LaunchCampaignConfig = {
  enabled: true,
  launchAt: '2026-11-01T10:00:00+02:00',
  hideAt: null,
  branchId: 5,
  video: {
    webm: 'assets/launch/scoop-teaser.webm',
    mp4: 'assets/launch/scoop-teaser.mp4',
  },
  poster: 'assets/launch/scoop-poster.webp',
  gallery: [
    'assets/launch/scoop-1.webp',
    'assets/launch/scoop-2.webp',
    'assets/launch/scoop-3.webp',
    'assets/launch/scoop-4.webp',
    'assets/launch/scoop-5.webp',
  ],
  photoMs: 3500,
  productName: '',
};
