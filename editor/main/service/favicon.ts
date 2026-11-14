const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
// An ICO directory entry stores each dimension in one byte, 0 meaning 256.
const MAX_FAVICON_SIZE = 256;

function isIco(bytes: Buffer): boolean {
  return (
    bytes.length >= 22 &&
    bytes.readUInt16LE(0) === 0 &&
    bytes.readUInt16LE(2) === 1 &&
    bytes.readUInt16LE(4) >= 1
  );
}

/** Either the converted bytes, or why the image can't be a favicon. */
export type IcoResult = { ico: Buffer } | { error: string };

/** Embeds a PNG as-is in an ICO container, which browsers read natively. */
function pngToIco(png: Buffer): IcoResult {
  if (
    png.length < 24 ||
    !png.subarray(0, 8).equals(PNG_SIGNATURE) ||
    png.toString("latin1", 12, 16) !== "IHDR"
  ) {
    return { error: "That file isn't a valid PNG or ICO image" };
  }
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (width !== height) {
    return {
      error: `The favicon must be square, but this image is ${width}×${height}`,
    };
  }
  if (width === 0 || width > MAX_FAVICON_SIZE) {
    return {
      error: `The favicon can be at most ${MAX_FAVICON_SIZE}×${MAX_FAVICON_SIZE}, but this image is ${width}×${height}`,
    };
  }
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // image count
  header.writeUInt8(width === MAX_FAVICON_SIZE ? 0 : width, 6);
  header.writeUInt8(height === MAX_FAVICON_SIZE ? 0 : height, 7);
  header.writeUInt16LE(1, 10); // colour planes
  header.writeUInt16LE(32, 12); // bits per pixel
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(header.length, 18); // image data offset
  return { ico: Buffer.concat([header, png]) };
}

/** The bytes of a favicon.ico for an image that is an ICO or a PNG. */
export function toIco(bytes: Buffer): IcoResult {
  return isIco(bytes) ? { ico: bytes } : pngToIco(bytes);
}
