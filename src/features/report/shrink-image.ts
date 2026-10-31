import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { REPORT_LIMITS, type ReportImage, base64Bytes } from './report-protocol';

/** Wide enough to read a screenshot; a phone screenshot is about 1080. */
const MAX_WIDTH = 900;
/** JPEG quality, then a smaller one when the file is still too big (very tall screenshots). */
const QUALITY = [0.7, 0.45];

export interface PickedImage extends ReportImage {
  /** The shrunk copy in the cache, for the preview. */
  uri: string;
}

/** A screenshot made small enough to send: JPEG, at most 900 wide. Null when still too big. */
export async function shrinkImage(uri: string): Promise<PickedImage | null> {
  let image = await ImageManipulator.manipulate(uri).renderAsync();
  if (image.width > MAX_WIDTH) {
    image = await ImageManipulator.manipulate(image).resize({ width: MAX_WIDTH }).renderAsync();
  }
  for (const compress of QUALITY) {
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress, base64: true });
    if (saved.base64 && base64Bytes(saved.base64) <= REPORT_LIMITS.maxImageBytes) {
      return { uri: saved.uri, type: 'image/jpeg', data: saved.base64 };
    }
  }
  return null;
}
