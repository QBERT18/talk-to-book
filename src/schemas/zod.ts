import * as z from "zod"

const isClient = typeof window !== "undefined";

export const formSchema = z.object({
    title: z.string().min(1, "Title is required").max(300, "Title is too long"),
    author: z.string().max(200, "Author name is too long").optional(),
    description: z.string().max(2000, "Description is too long").optional(),
    file: z
        .custom<FileList>((val) => isClient ? val instanceof FileList : true, "PDF file is required")
        .refine((files) => isClient ? files.length > 0 : true, "PDF file is required")
        .refine(
            (files) => isClient ? files[0]?.type === "application/pdf" : true,
            "Only PDF files are allowed"
        ).optional(),
    cover: z
        .custom<FileList>((val) => isClient ? val instanceof FileList : true, "Cover image is required")
        .refine((files) => isClient ? files.length > 0 : true, "Cover image is required")
        .refine(
            (files) => 
                isClient ? (["image/jpeg", "image/png", "image/webp"].includes(files[0]?.type)) : true,
            "Only image files (JPG, PNG, WEBP) are allowed"
        ).optional(),
})
