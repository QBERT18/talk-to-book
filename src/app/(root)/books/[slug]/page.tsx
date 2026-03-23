import dbConnect from "@/lib/mongodb";
import Book, { IBook } from "@/models/Book";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { PencilEdit01Icon, Chat01Icon } from "@hugeicons/core-free-icons";

interface BookDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function BookDetailPage({ params }: BookDetailPageProps) {
  const { slug } = await params;

  await dbConnect();
  const book = await Book.findOne({ slug }).lean() as unknown as IBook;

  if (!book) {
    notFound();
  }

  // Convert cover Buffer to Base64 data URI if it exists
  let coverDataUri = null;
  if (book.coverContent) {
    try {
      let buffer: Buffer;
      if (Buffer.isBuffer(book.coverContent)) {
        buffer = book.coverContent;
      } else {
        // Handle Mongoose/MongoDB Binary object when using .lean()
        const binaryData = book.coverContent as unknown as { buffer: Uint8Array | ArrayBuffer; _bsontype?: string };
        const data = binaryData.buffer || binaryData as unknown as Uint8Array | ArrayBuffer;
        buffer = Buffer.from(data instanceof ArrayBuffer ? new Uint8Array(data) : data as Uint8Array);
      }
      
      coverDataUri = `data:${book.coverType || "image/png"};base64,${buffer.toString("base64")}`;
    } catch (e) {
      console.error("Error converting cover content to base64:", e);
    }
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className="aspect-[3/4] relative bg-muted rounded-lg overflow-hidden border">
             {coverDataUri ? (
               <Image 
                 src={coverDataUri} 
                 alt={`${book.title} cover`}
                 fill
                 className="object-cover"
                 unoptimized
               />
             ) : (
               <div className="flex items-center justify-center h-full text-muted-foreground">
                 No Cover Image
               </div>
             )}
          </div>
        </div>
        
        <div className="md:col-span-2 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold">{book.title}</h1>
              <p className="text-xl text-muted-foreground mt-2">By {book.author || "Unknown Author"}</p>
            </div>
            <div className="flex gap-2">
              <Link 
                href={`/books/${book.slug}/chat`}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
              >
                <HugeiconsIcon icon={Chat01Icon} size={18} />
                Chat
              </Link>
              <Link 
                href={`/books/${book.slug}/edit`}
                className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
              >
                <HugeiconsIcon icon={PencilEdit01Icon} size={18} />
                Edit
              </Link>
            </div>
          </div>

          {book.description && (
            <div>
              <h2 className="text-xl font-semibold mb-2">Description</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">{book.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-4 border-t text-sm">
            <div>
              <span className="font-semibold">File Name:</span> {book.fileName}
            </div>
            <div>
              <span className="font-semibold">File Size:</span> {(book.fileSize / 1024 / 1024).toFixed(2)} MB
            </div>
            <div>
              <span className="font-semibold">Chunks:</span> {book.chunksCount || 0}
            </div>
            <div>
              <span className="font-semibold">Uploaded:</span> {new Date(book.createdAt).toLocaleDateString("de-DE")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
