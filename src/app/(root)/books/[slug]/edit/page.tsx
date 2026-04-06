import dbConnect from "@/lib/mongodb";
import Book, { IBookData } from "@/models/Book";
import { notFound } from "next/navigation";
import BookForm, { BookFormProps } from "@/components/book-form";

interface EditBookPageProps {
  params: Promise<{
    slug: string;
  }>;
}

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
  };

  return <BookForm initialData={initialData} />;
}
