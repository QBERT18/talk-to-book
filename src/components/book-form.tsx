"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { Upload01Icon, Image01Icon, Loading03Icon } from "@hugeicons/core-free-icons"
import { formSchema } from "@/schemas/zod"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
    InputGroup,
    InputGroupTextarea,
} from "@/components/ui/input-group"

import { useRouter } from "next/navigation"
import { uploadBookAction, updateBookAction } from "@/app/(root)/books/actions/book"

export interface BookFormProps {
    initialData?: {
        id: string;
        title: string;
        author?: string;
        description?: string;
    }
}

export default function BookForm({ initialData }: BookFormProps) {
    const router = useRouter()
    const [isUploading, setIsUploading] = React.useState(false)
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: initialData?.title || "",
            author: initialData?.author || "",
            description: initialData?.description || "",
        },
    })

    async function onSubmit(data: z.infer<typeof formSchema>) {
        console.log("Client-side onSubmit started with data:", data)
        setIsUploading(true)
        try {
            const formData = new FormData()
            formData.append("title", data.title)
            if (data.author) formData.append("author", data.author)
            if (data.description) formData.append("description", data.description)

            if (data.file && data.file.length > 0) {
                formData.append("file", data.file[0])
            }

            if (data.cover && data.cover.length > 0) {
                formData.append("cover", data.cover[0])
            }

            let result;
            if (initialData?.id) {
                console.log("Calling updateBookAction...")
                result = await updateBookAction(initialData.id, formData)
            } else {
                console.log("Calling uploadBookAction...")
                if (!data.file || data.file.length === 0) {
                    toast("Error", { description: "PDF file is required for new uploads" })
                    setIsUploading(false)
                    return
                }
                if (!data.cover || data.cover.length === 0) {
                    toast("Error", { description: "Cover image is required for new uploads" })
                    setIsUploading(false)
                    return
                }
                result = await uploadBookAction(formData)
            }

            console.log("Action result:", result)

            if (result.success) {
                toast("Success", {
                    description: `Book "${result.book?.title}" ${initialData?.id ? "updated" : "uploaded"} successfully.`,
                    position: "bottom-right",
                })
                router.push(`/books/${result.book?.slug}`)
            } else {
                toast("Error", {
                    description: result.error || `Failed to ${initialData?.id ? "update" : "upload"} book.`,
                    position: "bottom-right",
                })
            }
        } catch (error) {
            console.error("Submission error:", error)
            toast("Error", {
                description: "An unexpected error occurred.",
                position: "bottom-right",
            })
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="flex flex-1 items-center justify-center p-4">
            <Card className="w-full sm:max-w-md">
                <CardHeader>
                    <CardTitle>{initialData?.id ? "Edit Book" : "Upload Book"}</CardTitle>
                    <CardDescription>
                        {initialData?.id
                          ? "Update the book details or replace files."
                          : "Upload a PDF book to start talking to it."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form
                        id="book-upload-form"
                        onSubmit={form.handleSubmit(
                            onSubmit,
                            (errors) => console.log("Form validation errors:", errors)
                        )}
                    >
                        <FieldGroup>
                            <Controller
                                name="title"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="book-title">
                                            Title
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="book-title"
                                            aria-invalid={fieldState.invalid}
                                            placeholder="Enter book title"
                                            autoComplete="off"
                                        />
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />
                            <Controller
                                name="author"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="book-author">
                                            Author
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="book-author"
                                            aria-invalid={fieldState.invalid}
                                            placeholder="Enter author name"
                                            autoComplete="off"
                                        />
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />
                            <Controller
                                name="description"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="book-description">
                                            Description
                                        </FieldLabel>
                                        <InputGroup>
                                            <InputGroupTextarea
                                                {...field}
                                                id="book-description"
                                                placeholder="Enter book description"
                                                rows={4}
                                                className="min-h-24 resize-none"
                                                aria-invalid={fieldState.invalid}
                                            />
                                        </InputGroup>
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />
                            <Controller
                                name="file"
                                control={form.control}
                                render={({ field: { onChange, value, ...field }, fieldState }) => {
                                    const file = (typeof window !== "undefined" && value instanceof FileList) ? value[0] : null
                                    return (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="book-file">
                                                PDF File {initialData?.id && "(Optional)"}
                                            </FieldLabel>
                                            <div
                                                className="relative flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-input bg-input/10 transition-colors hover:bg-input/20 aria-invalid:border-destructive"
                                                onClick={() => document.getElementById("book-file")?.click()}
                                                aria-invalid={fieldState.invalid}
                                            >
                                                <input
                                                    {...field}
                                                    type="file"
                                                    accept=".pdf,application/pdf"
                                                    id="book-file"
                                                    className="hidden"
                                                    onChange={(e) => onChange(e.target.files)}
                                                />
                                                <HugeiconsIcon
                                                    icon={Upload01Icon}
                                                    className="mb-2 size-8 text-muted-foreground"
                                                />
                                                <span className="text-sm font-medium text-muted-foreground">
                                                    {file ? file.name : (initialData?.id ? "Click to replace PDF" : "Click to upload PDF")}
                                                </span>
                                                {file && (
                                                    <span className="mt-1 text-xs text-muted-foreground/60">
                                                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                                                    </span>
                                                )}
                                            </div>
                                            {fieldState.invalid && (
                                                <FieldError errors={[fieldState.error]} />
                                            )}
                                        </Field>
                                    )
                                }}
                            />
                            <Controller
                                name="cover"
                                control={form.control}
                                render={({ field: { onChange, value, ...field }, fieldState }) => {
                                    const file = (typeof window !== "undefined" && value instanceof FileList) ? value[0] : null
                                    return (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="book-cover">
                                                Book Cover {initialData?.id && "(Optional)"}
                                            </FieldLabel>
                                            <div
                                                className="relative flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-input bg-input/10 transition-colors hover:bg-input/20 aria-invalid:border-destructive"
                                                onClick={() => document.getElementById("book-cover")?.click()}
                                                aria-invalid={fieldState.invalid}
                                            >
                                                <input
                                                    {...field}
                                                    type="file"
                                                    accept="image/jpeg,image/png,image/webp"
                                                    id="book-cover"
                                                    className="hidden"
                                                    onChange={(e) => onChange(e.target.files)}
                                                />
                                                <HugeiconsIcon
                                                    icon={Image01Icon}
                                                    className="mb-2 size-8 text-muted-foreground"
                                                />
                                                <span className="text-sm font-medium text-muted-foreground">
                                                    {file ? file.name : (initialData?.id ? "Click to replace cover" : "Click to upload cover image")}
                                                </span>
                                                {file && (
                                                    <span className="mt-1 text-xs text-muted-foreground/60">
                                                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                                                    </span>
                                                )}
                                            </div>
                                            {fieldState.invalid && (
                                                <FieldError errors={[fieldState.error]} />
                                            )}
                                        </Field>
                                    )
                                }}
                            />
                        </FieldGroup>
                    </form>
                </CardContent>
                <CardFooter>
                    <Field orientation="horizontal">
                        <Button type="button" variant="outline" onClick={() => form.reset()}>
                            Reset
                        </Button>
                        <Button type="submit" form="book-upload-form" disabled={isUploading}>
                            {isUploading ? (
                                <>
                                    <HugeiconsIcon
                                        icon={Loading03Icon}
                                        className="mr-2 size-4 animate-spin"
                                    />
                                    {initialData?.id ? "Updating..." : "Uploading..."}
                                </>
                            ) : (
                                initialData?.id ? "Update" : "Upload"
                            )}
                        </Button>
                    </Field>
                </CardFooter>
            </Card>
        </div>
    )
}
