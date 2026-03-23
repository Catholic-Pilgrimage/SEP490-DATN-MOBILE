/**
 * Tính khung 16:9 nằm gọn trong màn hình — căn giữa player fullscreen (chỉ dùng RN, không cần thư viện xoay).
 */
export function getBounded16by9Size(
  windowWidth: number,
  windowHeight: number,
  maxHeightFraction = 0.92,
): { width: number; height: number } {
  const maxH = windowHeight * maxHeightFraction;
  const ar = 16 / 9;
  let w = windowWidth;
  let h = w / ar;
  if (h > maxH) {
    h = maxH;
    w = h * ar;
  }
  if (w > windowWidth) {
    w = windowWidth;
    h = w / ar;
  }
  return { width: Math.round(w), height: Math.round(h) };
}
