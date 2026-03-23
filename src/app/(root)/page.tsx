import Link from "next/link";
import Image from "next/image";
import dbConnect from "@/lib/mongodb";
import Book, { IBook } from "@/models/Book";

export default async function Home() {
  await dbConnect();
  const books = await Book.find({}).sort({ createdAt: -1 }).lean() as unknown as IBook[];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Your Books</h1>
        <Link 
          href="/books/new" 
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
        >
          Upload New Book
        </Link>
      </div>

      {books.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">You haven&#39;t uploaded any books yet.</p>
          <Link 
            href="/books/new" 
            className="text-primary font-semibold hover:underline"
          >
            Upload your first book
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {books.map((book: IBook) => {
            // Convert cover Buffer to Base64 data URI if it exists
            let coverDataUri = null;
            if (book.coverContent) {
              try {
                let buffer: Buffer;
                if (Buffer.isBuffer(book.coverContent)) {
                  buffer = book.coverContent;
                } else {
                  const binaryData = book.coverContent as unknown as { buffer: Uint8Array | ArrayBuffer };
                  const data = binaryData.buffer || binaryData as unknown as Uint8Array | ArrayBuffer;
                  buffer = Buffer.from(data instanceof ArrayBuffer ? new Uint8Array(data) : data as Uint8Array);
                }
                coverDataUri = `data:${book.coverType || "image/png"};base64,${buffer.toString("base64")}`;
              } catch (e) {
                console.error("Error converting cover content to base64:", e);
              }
            }

            return (
              <Link 
                key={book._id.toString()} 
                href={`/books/${book.slug}`}
                className="group flex flex-col border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="aspect-[3/4] relative bg-muted border-b">
                  {coverDataUri ? (
                    <Image
                      src={coverDataUri}
                      alt={`${book.title} cover`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      No Cover
                    </div>
                  )}
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h2 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                    {book.title}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                    {book.author || "Unknown Author"}
                  </p>
                  <div className="mt-auto pt-3 text-xs text-muted-foreground">
                    Added {new Date(book.createdAt).toLocaleDateString("de-DE")}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
