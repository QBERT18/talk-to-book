import dbConnect from "@/lib/mongodb";
import Book, { IBookData } from "@/models/Book";
import { notFound } from "next/navigation";
import BookForm, { BookFormProps } from "@/components/book-form";

interface EditBookPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function EditBookPage({ params }: EditBookPageProps) {
  const { slug } = await params;

  await dbConnect();
  const book = await Book.findOne({ slug }).lean<IBookData | null>();

  if (!book) {
    notFound();
  }

  const initialData: BookFormProps["initialData"] = {
    id: book._id.toString(),
    title: book.title,
    author: book.author,
    description: book.description,
    // Only expose a cover URL if the document actually has bytes — legacy books
    // may carry coverName/coverSize metadata without any coverContent.
    existingCoverUrl:
      book.coverContent != null
        ? `/api/books/${book._id.toString()}/cover`
        : undefined,
  };

  return <BookForm initialData={initialData} />;
}
