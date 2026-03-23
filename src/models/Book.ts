import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBook extends Document {
  title: string;
  slug: string;
  author?: string;
  description?: string;
  fileName: string;
  fileType: "pdf";
  fileSize: number;
  chunksCount?: number;
  coverName?: string;
  coverType?: string;
  coverSize?: number;
  coverContent?: Buffer;
  fileId?: string;
  coverId?: string;
  pageCount?: number;
  language?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookSchema: Schema = new Schema(
  {
    title: { type: String, required: true, maxlength: 300, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    author: { type: String, maxlength: 200 },
    description: { type: String, maxlength: 2000 },
    fileName: { type: String, required: true },
    fileType: { type: String, required: true, enum: ["pdf"], default: "pdf" },
    fileSize: { type: Number, required: true },
    chunksCount: { type: Number },
    coverName: { type: String },
    coverType: { type: String },
    coverSize: { type: Number },
    coverContent: { type: Schema.Types.Buffer, select: true },
    fileId: { type: String },
    coverId: { type: String },
    pageCount: { type: Number },
    language: { type: String },
    errorMessage: { type: String },
  },
  {
    timestamps: true,
    strict: true,
  }
);

BookSchema.index({ createdAt: -1 });

// Force deletion of existing model if we're in development to ensure schema updates are applied
if (process.env.NODE_ENV === "development" && mongoose.models.Book) {
  delete mongoose.models.Book;
}

const Book: Model<IBook> = mongoose.models.Book || mongoose.model<IBook>("Book", BookSchema);

export default Book;

export interface IBookChunk extends Document {
  bookId: mongoose.Types.ObjectId;
  chunkNumber: number;
  content: Buffer;
  size: number;
  createdAt: Date;
}

const BookChunkSchema: Schema = new Schema({
  bookId: { type: Schema.Types.ObjectId, ref: "Book", required: true },
  chunkNumber: { type: Number, required: true },
  content: { type: Buffer, required: true },
  size: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

BookChunkSchema.index({ bookId: 1, chunkNumber: 1 }, { unique: true });

export const BookChunk: Model<IBookChunk> = 
  mongoose.models.BookChunk || mongoose.model<IBookChunk>("BookChunk", BookChunkSchema);
