import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Book from "@/models/Book";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return new NextResponse("Invalid book id", { status: 400 });
  }

  await dbConnect();

  const book = await Book.findById(id)
    .select("coverContent coverType")
    .lean<{ coverContent?: Buffer | { buffer?: Buffer }; coverType?: string }>();

  if (!book?.coverContent) {
    return new NextResponse("Not found", { status: 404 });
  }

  // With .lean(), Mongoose returns a BSON Binary (not a Node Buffer) for
  // Schema.Types.Buffer fields. The real bytes hang off its `.buffer` property.
  const raw = book.coverContent;
  const buffer: Buffer = Buffer.isBuffer(raw)
    ? raw
    : Buffer.isBuffer(raw.buffer)
      ? raw.buffer
      : Buffer.from(raw as unknown as Uint8Array);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": book.coverType || "image/png",
      "Content-Length": String(buffer.length),
      "Cache-Control": "public, max-age=3600, immutable",
    },
  });
}
