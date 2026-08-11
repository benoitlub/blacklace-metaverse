/**
 * Construit un GLB (glTF 2.0 binaire) minimal mais valide : un triangle unique.
 *
 * Objectif : le mode mock renvoie un vrai fichier importable dans Unity, pas un
 * JSON factice. La chaîne complète (route -> pipeline -> téléchargement -> import)
 * est donc testable sans aucune clé API.
 *
 * Tout est écrit via DataView en little-endian, comme l'exige la spécification glTF.
 */

const GLB_MAGIC = 0x46546c67; // "glTF"
const CHUNK_JSON = 0x4e4f534a; // "JSON"
const CHUNK_BIN = 0x004e4942; // "BIN\0"

const align4 = (value: number): number => Math.ceil(value / 4) * 4;

// Triangle unitaire dans le plan XY.
const POSITIONS = [0, 0, 0, 1, 0, 0, 0, 1, 0];
const INDICES = [0, 1, 2];

export function buildMockGlb(name = "BlacklaceMockAsset"): ArrayBuffer {
  const positionsBytes = POSITIONS.length * 4; // 36
  const indicesBytes = INDICES.length * 2; // 6
  const indicesOffset = align4(positionsBytes); // 36
  const binLength = align4(indicesOffset + indicesBytes); // 44

  const gltf = {
    asset: { version: "2.0", generator: "blacklace-metaverse-adapter (mock)" },
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

  // En-tête.
  view.setUint32(0, GLB_MAGIC, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, totalLength, true);

  // Chunk JSON, complété par des espaces jusqu'au multiple de 4.
  let offset = 12;
  view.setUint32(offset, jsonLength, true);
  view.setUint32(offset + 4, CHUNK_JSON, true);
  offset += 8;
  bytes.fill(0x20, offset, offset + jsonLength);
  bytes.set(jsonBytes, offset);
  offset += jsonLength;

  // Chunk BIN, complété par des zéros.
  view.setUint32(offset, binLength, true);
  view.setUint32(offset + 4, CHUNK_BIN, true);
  offset += 8;

  const binStart = offset;
  POSITIONS.forEach((value, index) => view.setFloat32(binStart + index * 4, value, true));
  INDICES.forEach((value, index) => view.setUint16(binStart + indicesOffset + index * 2, value, true));

  return buffer;
}
