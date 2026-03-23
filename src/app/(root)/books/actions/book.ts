"use server";

import dbConnect from "@/lib/mongodb";
import Book, { BookChunk } from "@/models/Book";
import { slugify } from "@/lib/utils";
import { revalidatePath } from "next/cache";

const CHUNK_SIZE = 512 * 1024; // 512KB per chunk

export async function uploadBookAction(formData: FormData) {
  console.log("=== SERVER ACTION: uploadBookAction EXECUTING ===");
  try {
    console.log("Starting uploadBookAction...");
    await dbConnect();
    console.log("Connected to database for upload.");

    const title = formData.get("title") as string;
    const author = formData.get("author") as string;
    const description = formData.get("description") as string;
    
    console.log("FormData retrieved:", { title, author });
    
    // In Next.js server actions, files can be received via FormData
    const file = formData.get("file") as File | null;
    const cover = formData.get("cover") as File | null;

    if (!file || !(file instanceof File) || file.size === 0) {
      return { success: false, error: "Valid PDF file is required" };
    }
    if (!cover || !(cover instanceof File) || cover.size === 0) {
      return { success: false, error: "Valid cover image is required" };
    }

    // Check if the collection exists by attempting a count or similar
    // This helps in cases where Mongoose attempts an index check on a non-existent namespace
    // though Mongoose usually handles this. If it fails with NamespaceNotFound, we might need
    // to ensure the collection is created.
    
    try {
      if (Book.db) {
         console.log("Ensuring collection 'books' exists. DB Name:", Book.db.name);
      }
    } catch (error) {
       console.log("Collection check log:", error instanceof Error ? error.message : error);
    }
    
    const baseSlug = slugify(title);
    let finalSlug = baseSlug;
    
    // Simple uniqueness check
    let counter = 0;
    
    // We can also use Model.createCollection() to ensure it exists if needed, 
    // but findOne usually works fine unless there is an authentication issue or a driver bug.
    
    let existingBook = null;
    try {
      existingBook = await Book.findOne({ slug: finalSlug });
    } catch (error) {
       // If it fails with NamespaceNotFound, it means the collection truly doesn't exist
       // We can ignore it and proceed to create, which will create the collection.
       if (error instanceof Error && error.name === 'MongoServerError' && error.message.includes('ns does not exist')) {
         existingBook = null;
       } else {
         throw error;
       }
    }

    while (existingBook) {
      counter++;
      finalSlug = `${baseSlug}-${counter}`;
      existingBook = await Book.findOne({ slug: finalSlug });
    }

    console.log("Creating book document with slug:", finalSlug);
    
    // Read file and split into chunks
    const fileArrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(fileArrayBuffer);
    const totalChunks = Math.ceil(fileBuffer.length / CHUNK_SIZE);

    // Read cover image
    const coverArrayBuffer = await cover.arrayBuffer();
    const coverBuffer = Buffer.from(coverArrayBuffer);
    
    console.log("Cover buffer created, size:", coverBuffer.length);

    const bookData = {
      title,
      author,
      description,
      slug: finalSlug,
      fileName: file.name,
      fileType: "pdf",
      fileSize: file.size,
      chunksCount: totalChunks,
      coverName: cover.name,
      coverType: cover.type || "image/png",
      coverSize: cover.size,
      coverContent: coverBuffer,
    };

    console.log("Saving bookData to DB (keys):", Object.keys(bookData));
    
    const newBook = await Book.create(bookData);
    console.log("Book created successfully, ID:", newBook._id);
    
    // Check if coverContent is actually on the returned Mongoose document
    console.log("Mongoose document keys:", Object.keys(newBook.toObject()));
    console.log("Saved book coverContent exists in result:", !!newBook.coverContent);
    if (newBook.coverContent) {
      console.log("Saved book coverContent size:", newBook.coverContent.length);
    } else {
      console.warn("WARNING: coverContent is MISSING in the created document!");
    }

    // Save chunks
    console.log(`Saving ${totalChunks} chunks...`);
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, fileBuffer.length);
      const chunkData = fileBuffer.subarray(start, end);
      
      await BookChunk.create({
        bookId: newBook._id,
        chunkNumber: i,
        content: chunkData,
        size: chunkData.length,
      });
    }
    console.log("All chunks saved.");

    revalidatePath("/");
    revalidatePath(`/books/${finalSlug}`);
    
    return { 
      success: true, 
      book: {
        id: newBook._id.toString(),
        slug: newBook.slug,
        title: newBook.title
      } 
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to upload book";
    console.error("Upload error:", error);
    return { success: false, error: errorMessage };
  }
}

export async function updateBookAction(bookId: string, formData: FormData) {
  console.log("=== SERVER ACTION: updateBookAction EXECUTING ===");
  try {
    await dbConnect();
    
    const title = formData.get("title") as string;
    const author = formData.get("author") as string;
    const description = formData.get("description") as string;
    
    const file = formData.get("file") as File | null;
    const cover = formData.get("cover") as File | null;

    const existingBook = await Book.findById(bookId);
    if (!existingBook) {
      return { success: false, error: "Book not found" };
    }

    const updateData: Partial<IBook> = {
      title,
      author,
      description,
    };

    // Only update slug if title changed
    if (title !== existingBook.title) {
        const baseSlug = slugify(title);
        let finalSlug = baseSlug;
        let counter = 0;
        let slugBook = await Book.findOne({ slug: finalSlug, _id: { $ne: bookId } });
        while (slugBook) {
            counter++;
            finalSlug = `${baseSlug}-${counter}`;
            slugBook = await Book.findOne({ slug: finalSlug, _id: { $ne: bookId } });
        }
        updateData.slug = finalSlug;
    }

    // Handle new PDF file if provided
    if (file && file instanceof File && file.size > 0) {
      const fileArrayBuffer = await file.arrayBuffer();
      const fileBuffer = Buffer.from(fileArrayBuffer);
      const totalChunks = Math.ceil(fileBuffer.length / CHUNK_SIZE);

      updateData.fileName = file.name;
      updateData.fileSize = file.size;
      updateData.chunksCount = totalChunks;

      // Delete old chunks
      await BookChunk.deleteMany({ bookId: existingBook._id });

      // Save new chunks
      console.log(`Updating with ${totalChunks} new chunks...`);
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, fileBuffer.length);
        const chunkData = fileBuffer.subarray(start, end);
        
        await BookChunk.create({
          bookId: existingBook._id,
          chunkNumber: i,
          content: chunkData,
          size: chunkData.length,
        });
      }
    }

    // Handle new cover if provided
    if (cover && cover instanceof File && cover.size > 0) {
      const coverArrayBuffer = await cover.arrayBuffer();
      const coverBuffer = Buffer.from(coverArrayBuffer);
      
      updateData.coverName = cover.name;
      updateData.coverType = cover.type || "image/png";
      updateData.coverSize = cover.size;
      updateData.coverContent = coverBuffer;
    }

    const updatedBook = await Book.findByIdAndUpdate(bookId, updateData, { new: true });
    
    if (!updatedBook) {
        return { success: false, error: "Failed to update book" };
    }

    revalidatePath("/");
    revalidatePath(`/books/${updatedBook.slug}`);
    
    return { 
      success: true, 
      book: {
        id: updatedBook._id.toString(),
        slug: updatedBook.slug,
        title: updatedBook.title
      } 
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update book";
    console.error("Update error:", error);
    return { success: false, error: errorMessage };
  }
}
