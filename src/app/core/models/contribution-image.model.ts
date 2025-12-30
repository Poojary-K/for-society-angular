export interface ContributionImage {
  imageid: number;
  contributionid: number;
  url: string;
  createdat: string;
}

export interface ContributionImagesResponse {
  images: ContributionImage[];
}
