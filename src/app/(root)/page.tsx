import Link from "next/link";
import Image from "next/image";
import dbConnect from "@/lib/mongodb";
import Book, { IBookData } from "@/models/Book";

type BookListItem = Omit<IBookData, "coverContent"> & { hasCover: boolean };

export default async function Home() {
  await dbConnect();
  // Aggregation rather than .find() so we can compute hasCover from the
  // *actual* presence of coverContent (legacy docs may have coverSize metadata
  // but no coverContent bytes) without ever pulling the binary into memory.
  const books = await Book.aggregate<BookListItem>([
    { $sort: { createdAt: -1 } },
    {
      $addFields: {
        hasCover: {
          $and: [
            { $ne: [{ $type: "$coverContent" }, "missing"] },
            { $ne: ["$coverContent", null] },
          ],
        },
      },
    },
    { $project: { coverContent: 0 } },
  ]);

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
          {books.map((book) => {
            const coverUrl = `/api/books/${book._id.toString()}/cover`;

            return (
              <Link
                key={book._id.toString()}
                href={`/books/${book.slug}`}
                className="group flex flex-col border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="aspect-[3/4] relative bg-muted border-b">
                  {book.hasCover ? (
                    <Image
                      src={coverUrl}
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
