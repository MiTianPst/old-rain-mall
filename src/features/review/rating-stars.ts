export function isRatingHighlighted(star: number, selectedRating: number) {
  return star <= selectedRating;
}
