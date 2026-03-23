export interface Book {
  id: string; // MongoDB ObjectId as string

  // Core metadata
  title: string;
  slug: string;
  author?: string;
  description?: string;

  // File info (stored in MongoDB or GridFS)
  fileName: string;
  fileType: "pdf";
  fileSize: number;

  // Chunk info (for PDF stored in chunks)
  chunksCount?: number;

  // Image info (cover)
  coverName?: string;
  coverType?: string;
  coverSize?: number;
  coverContent?: Uint8Array; // Added coverContent

  // If using GridFS or storing binary separately
  fileId?: string; // reference to stored file (GridFS id or similar)
  coverId?: string; // reference to stored cover (GridFS id or similar)

  // Document metadata (derived after parsing)
  pageCount?: number;
  language?: string;

  // Error handling
  errorMessage?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface BookChunk {
  id: string; // MongoDB ObjectId as string
  bookId: string; // Reference to the book id
  chunkNumber: number; // Order of the chunk
  content: Uint8Array | string; // The binary content or base64
  size: number; // Size of this chunk in bytes
  createdAt: Date;
}
