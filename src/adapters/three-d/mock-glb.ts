/**
 * Builds a minimal but valid GLB (binary glTF 2.0): a single triangle.
 *
 * The mock provider therefore returns a real file that Unity can import, not a
 * placeholder descriptor. That keeps the whole chain — route, job, download,
 * import — testable without any external credential.
 *
 * All values are written little-endian through a DataView, as the glTF
 * specification requires.
 */

const GLB_MAGIC = 0x46546c67; // "glTF"
const CHUNK_JSON = 0x4e4f534a; // "JSON"
const CHUNK_BIN = 0x004e4942; // "BIN\0"

const align4 = (value: number): number => Math.ceil(value / 4) * 4;

const POSITIONS = [0, 0, 0, 1, 0, 0, 0, 1, 0];
const INDICES = [0, 1, 2];

export function buildMockGlb(name = "GeneratedAsset"): ArrayBuffer {
  const positionsBytes = POSITIONS.length * 4;
  const indicesBytes = INDICES.length * 2;
  const indicesOffset = align4(positionsBytes);
  const binLength = align4(indicesOffset + indicesBytes);

  const gltf = {
    asset: { version: "2.0", generator: "metaverse-creator (mock)" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name }],
    meshes: [{ name, primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
    buffers: [{ byteLength: binLength }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positionsBytes, target: 34962 },
      { buffer: 0, byteOffset: indicesOffset, byteLength: indicesBytes, target: 34963 },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126, // FLOAT
        count: 3,
        type: "VEC3",
        min: [0, 0, 0],
        max: [1, 1, 0],
      },
      {
        bufferView: 1,
        componentType: 5123, // UNSIGNED_SHORT
        count: 3,
        type: "SCALAR",
      },
    ],
  };

  const jsonBytes = new TextEncoder().encode(JSON.stringify(gltf));
  const jsonLength = align4(jsonBytes.length);
  const totalLength = 12 + 8 + jsonLength + 8 + binLength;

  const buffer = new ArrayBuffer(totalLength);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  view.setUint32(0, GLB_MAGIC, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, totalLength, true);

  // JSON chunk, padded with spaces to a multiple of four.
  let offset = 12;
  view.setUint32(offset, jsonLength, true);
  view.setUint32(offset + 4, CHUNK_JSON, true);
  offset += 8;
  bytes.fill(0x20, offset, offset + jsonLength);
  bytes.set(jsonBytes, offset);
  offset += jsonLength;

  // BIN chunk, padded with zeroes.
  view.setUint32(offset, binLength, true);
  view.setUint32(offset + 4, CHUNK_BIN, true);
  offset += 8;

  const binStart = offset;
  POSITIONS.forEach((value, index) => view.setFloat32(binStart + index * 4, value, true));
  INDICES.forEach((value, index) =>
    view.setUint16(binStart + indicesOffset + index * 2, value, true),
  );

  return buffer;
}
