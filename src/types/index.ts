export interface ProjectConfig {
  name: string;
  version: string;
  createdAt: string;
}

export interface FetchedMeta {
  finalUrl: string;
  domain: string;
  title: string;
  metaDescription: string;
  extractedTextPreview: string;
}

export interface ScanContext {
  url: string;
  description: string;
  targetAudience: string;
  scannedAt: string;
  category?: string;
  fetched?: FetchedMeta;
}
