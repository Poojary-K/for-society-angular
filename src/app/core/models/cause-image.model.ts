export interface CauseImage {
  imageid: number;
  causeid: number;
  url: string;
  createdat: string;
}

export interface CauseImagesResponse {
  images: CauseImage[];
}
