"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, FileText, ImagePlus, Link2, PenLine, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ManualRecipeForm } from "./manual-recipe-form";
import { previewRecipe, restoreRecipePreview, type ImportPreview } from "@/lib/imports/actions";
import { jsonValueSchema } from "@/lib/json";

const sources = [
  { id: "link", label: "Link", detail: "Website or YouTube", icon: Link2 },
  { id: "photo", label: "Photo", detail: "Recipe card or screenshot", icon: ImagePlus },
  { id: "text", label: "Text", detail: "Paste or open a text file", icon: FileText },
  { id: "manual", label: "Manual", detail: "Write your own recipe", icon: PenLine },
] as const;

type Source = (typeof sources)[number]["id"];

interface RecipeIntakeProps {
  readonly initialLink?: string;
}

function rememberRecipePreview(value: Readonly<ImportPreview>) {
  try {
    localStorage.setItem(
      "recipe-intake-preview",
      JSON.stringify({
        id: value.id,
        draft: value.draft,
        existingId: value.existing?.id ?? null,
        expectedUpdatedAt: value.existing ? new Date(value.existing.updatedAt).toISOString() : null,
      }),
    );
  } catch {
    /* In-memory review remains available. */
  }
}

export function RecipeIntake({ initialLink }: RecipeIntakeProps) {
  const router = useRouter();
  const [source, setSource] = useState<Source>("link");
  const [link, setLink] = useState(initialLink ?? "");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [review, setReview] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        setLink(initialLink ?? localStorage.getItem("recipe-intake-link") ?? "");
        setText(localStorage.getItem("recipe-intake-text") ?? "");
        const saved = localStorage.getItem("recipe-intake-preview");

        if (saved && !initialLink) {
          void restoreRecipePreview(jsonValueSchema.parse(JSON.parse(saved)))
            .then((result) => {
              if (!result.success) {
                setError(result.error);

                return result;
              }

              setPreview(result.data);
              setUpdateExisting(!!result.data.existing);
              setReview(true);

              return result;
            })
            .catch(() => setError("Could not restore your draft. Reload to retry."));
        }
      } catch {
        /* Inputs remain usable without storage. */
      }
    });
  }, [initialLink]);
  useEffect(() => {
    if (!file) {
      queueMicrotask(() => setPhotoUrl(""));

      return () => {};
    }

    const url = URL.createObjectURL(file);
    queueMicrotask(() => setPhotoUrl(url));

    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    if (review) {
      heading.current?.focus();
    }
  }, [review]);

  function remember(kind: "link" | "text", value: string) {
    if (kind === "link") {
      setLink(value);
    } else {
      setText(value);
    }

    try {
      localStorage.setItem(`recipe-intake-${kind}`, value);
    } catch {
      /* optional */
    }
  }

  function selectPhoto(next: File | undefined) {
    setError("");

    if (!next) {
      return;
    }

    if (
      !next.size ||
      next.size > 4 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(next.type)
    ) {
      setError("Choose a JPEG, PNG or WebP photo smaller than 4 MB.");

      return;
    }

    setFile(next);
  }

  async function handleTextFile(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];

    if (!selected) {
      return;
    }

    if (selected.size > 50000 || !selected.name.toLowerCase().endsWith(".txt")) {
      setError("Choose a .txt file smaller than 50 KB.");

      return;
    }

    try {
      remember("text", await selected.text());
      setError("");
    } catch {
      setError("Could not read that file. Try pasting its text.");
    }
  }

  function extract() {
    setError("");
    startTransition(async () => {
      const data = new FormData();
      data.set("source", source);
      data.set("content", source === "link" ? link : text);

      if (file) {
        data.set("file", file);
      }

      try {
        const result = await previewRecipe(data);

        if (!result.success) {
          setError(result.error);

          return;
        }

        setPreview(result.data);

        if (!result.data.existing) {
          rememberRecipePreview(result.data);
        }

        setUpdateExisting(false);
        setReview(!result.data.existing);
      } catch {
        setError("The connection was interrupted. Your input is still here; try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <ol aria-label="Recipe progress" className="flex gap-6 border-be border-border pbe-4 text-sm">
        <li
          aria-current={!review ? "step" : undefined}
          className={!review ? "font-semibold text-primary" : "text-muted-foreground"}
        >
          1. Choose source
        </li>
        <li
          aria-current={review ? "step" : undefined}
          className={review ? "font-semibold text-primary" : "text-muted-foreground"}
        >
          2. Review recipe
        </li>
        <li className="text-muted-foreground">3. Save & cook</li>
      </ol>
      <div hidden={review} className="flex flex-col gap-5">
        <div aria-label="Recipe source" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {sources.map(({ id, label, detail, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={source === id}
              disabled={pending}
              onClick={() => {
                setSource(id);
                setError("");
                setPreview(null);
              }}
              className={`rounded-xl border p-4 text-start transition-colors focus-visible:outline-2 focus-visible:outline-primary ${source === id ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted"}`}
            >
              <Icon className="mbe-3 size-5" aria-hidden="true" />
              <span className="block font-medium">{label}</span>
              <span className="mbs-1 block text-xs text-muted-foreground">{detail}</span>
            </button>
          ))}
        </div>
        <div hidden={source !== "manual"}>{!review && <ManualRecipeForm />}</div>
        {source !== "manual" && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              extract();
            }}
            className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6"
          >
            <fieldset disabled={pending} className="flex flex-col gap-4">
              {source === "link" && (
                <div className="flex flex-col gap-2">
                  <label htmlFor="recipe-link" className="font-medium">
                    Recipe link
                  </label>
                  <Input
                    id="recipe-link"
                    type="url"
                    required
                    value={link}
                    onChange={(event) => remember("link", event.target.value)}
                    placeholder="https://…"
                  />
                  <p className="text-sm text-muted-foreground">
                    Paste a recipe website, YouTube video or Shorts link. You’ll check the recipe
                    before saving.
                  </p>
                </div>
              )}
              {source === "text" && (
                <div className="flex flex-col gap-3">
                  <label htmlFor="recipe-text" className="font-medium">
                    Recipe text
                  </label>
                  <Textarea
                    id="recipe-text"
                    required
                    minLength={20}
                    maxLength={50000}
                    value={text}
                    onChange={(event) => remember("text", event.target.value)}
                    className="min-h-64"
                    placeholder={"Recipe name\n\nIngredients\n…\n\nInstructions\n…"}
                  />
                  <label className="block text-sm" htmlFor="recipe-text-file">
                    Or open a plain-text file (up to 50 KB)
                  </label>
                  <Input
                    id="recipe-text-file"
                    type="file"
                    accept=".txt,text/plain"
                    onChange={(event) => void handleTextFile(event)}
                  />
                </div>
              )}
              {source === "photo" && (
                <div className="flex flex-col gap-4">
                  <div
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();

                      if (!pending) {
                        selectPhoto(event.dataTransfer.files[0]);
                      }
                    }}
                    className="rounded-xl border-2 border-dashed border-border bg-background/60 px-5 py-8 text-center"
                  >
                    <ImagePlus className="mx-auto mbe-3 size-8 text-primary" />
                    <p className="font-serif text-xl">Bring a written recipe into your cookbook</p>
                    <p className="mx-auto mbs-2 max-w-md text-sm text-muted-foreground">
                      Drop a recipe card, cookbook page or screenshot here. JPEG, PNG or WebP, up to
                      4 MB. Photos of dishes alone cannot be transcribed.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="mbs-4"
                      onClick={() => fileInput.current?.click()}
                    >
                      Choose photo
                    </Button>
                    <input
                      ref={fileInput}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      aria-label="Recipe photo"
                      className="sr-only"
                      onChange={(event) => selectPhoto(event.target.files?.[0])}
                    />
                  </div>
                  {file && (
                    <div className="flex items-center gap-4">
                      {photoUrl && (
                        <Image
                          src={photoUrl}
                          alt="Selected recipe source"
                          width={96}
                          height={112}
                          unoptimized
                          className="h-28 w-24 rounded-lg object-contain"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm">{file.name}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setFile(null);

                            if (fileInput.current) {
                              fileInput.current.value = "";
                            }
                          }}
                        >
                          Remove photo
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                disabled={pending || (source === "photo" && !file)}
                className="w-full sm:w-auto"
              >
                {pending ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" /> Reading recipe…
                  </>
                ) : (
                  "Review recipe"
                )}
              </Button>
              {pending && (
                <p role="status" className="text-sm text-muted-foreground">
                  Reading the source. This may take up to a minute.
                </p>
              )}
            </fieldset>
          </form>
        )}
        {preview?.existing && !review && (
          <div className="flex flex-col gap-3 rounded-xl border border-primary/40 bg-primary/5 p-5">
            <h2 className="font-serif text-xl">This recipe is already in your cookbook</h2>
            <p>{preview.existing.title}. Your saved recipe has not been changed.</p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href={`/recipe/${preview.existing.slug}`} className="underline">
                Open existing recipe
              </Link>
              <Button
                onClick={() => {
                  setUpdateExisting(true);
                  rememberRecipePreview(preview);
                  setReview(true);
                }}
              >
                Review an update
              </Button>
            </div>
          </div>
        )}
      </div>
      {preview && review && (
        <div hidden={!review} className="flex flex-col gap-5">
          <Button variant="ghost" onClick={() => setReview(false)}>
            <ArrowLeft className="size-4" /> Back to source
          </Button>
          <div>
            <h2 ref={heading} tabIndex={-1} className="font-serif text-2xl">
              Make it yours
            </h2>
            <p className="mbs-2 text-sm text-muted-foreground">
              Check quantities and steps before saving. Nothing has been saved yet.
            </p>
          </div>
          <div className={photoUrl ? "grid items-start gap-6 lg:intake-grid" : ""}>
            {photoUrl && (
              <aside className="rounded-xl border border-border bg-card p-4">
                <details open>
                  <summary className="mbe-3 cursor-pointer font-medium">Original recipe</summary>
                  <Image
                    src={photoUrl}
                    alt="Original recipe for comparison"
                    width={800}
                    height={600}
                    unoptimized
                    className="w-full rounded-lg"
                  />
                </details>
              </aside>
            )}
            <ManualRecipeForm
              key={`${preview.id}:${String(updateExisting)}`}
              draftKey={`import:${preview.id}`}
              draft={preview.draft}
              onSuccess={(recipe) => {
                try {
                  localStorage.removeItem("recipe-intake-preview");
                } catch {
                  /* optional */
                }

                router.push(`/recipe/${recipe.slug}`);
                router.refresh();
              }}
              initialData={updateExisting ? (preview.existing ?? undefined) : undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
}
