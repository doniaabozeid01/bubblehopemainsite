/** API advertisement DTO + slim ad slide for the hero carousel. */
export interface AdvertisementDto {
  id: number | string;
  imageUrl?: string;
  url?: string;
  image?: string;
  title?: string;
  titleAr?: string;
  isMobileShow?: boolean;
}

export interface HeroAdSlide {
  id: string;
  image: string;
  imageAlt: string;
  href: string;
}
