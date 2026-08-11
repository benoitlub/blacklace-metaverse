export interface GenerateRequest {
  intent: string;
}

export interface GeneratedAsset {
  format: "glb";
  url: string;
  provider: string;
}

export interface GenerateResult {
  status: "completed" | "mocked";
  intent: string;
  prompt: string;
  provider: string;
  asset: GeneratedAsset;
}

export interface OctopusGenerateResponse {
  prompt?: string;
  output?: string;
  result?: string;
  [key: string]: unknown;
}

export interface ThreeDProvider {
  generate(prompt: string): Promise<GeneratedAsset>;
}
