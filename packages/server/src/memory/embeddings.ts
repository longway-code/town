// Lazy-loaded Xenova/transformers pipeline
let pipeline: ((text: string) => Promise<number[]>) | null = null;

async function getPipeline(): Promise<(text: string) => Promise<number[]>> {
  if (!pipeline) {
    // Dynamic import to avoid startup cost
    const { pipeline: xenovaPipeline } = await import('@xenova/transformers');
    const extractor = await xenovaPipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
      { quantized: true }
    );
    pipeline = async (text: string): Promise<number[]> => {
      const output = await extractor(text, { pooling: 'mean', normalize: true });
      // output.data is a Float32Array
      return Array.from(output.data as Float32Array);
    };
  }
  return pipeline;
}

export async function embed(text: string): Promise<number[]> {
  const fn = await getPipeline();
  return fn(text);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
