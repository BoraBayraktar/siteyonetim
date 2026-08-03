"use client";

import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Quote,
  Strikethrough,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { uploadAnnouncementImageAction } from "@/app/actions/announcements";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Props = {
  propertyId: string;
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
};

function ToolbarButton({
  active,
  disabled,
  onClick,
  children,
  label,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("size-8 shrink-0", active && "bg-muted")}
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </Button>
  );
}

function mimeToExtension(mimeType: string): string {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  return "png";
}

function normalizePastedImageFile(file: File): File {
  if (file.name.trim()) {
    return file;
  }
  const mimeType = file.type || "image/png";
  return new File([file], `pasted-image-${Date.now()}.${mimeToExtension(mimeType)}`, { type: mimeType });
}

function extractImageFromClipboard(clipboard: DataTransfer): File | null {
  for (const item of Array.from(clipboard.items)) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) {
        return normalizePastedImageFile(file);
      }
    }
  }

  const file = clipboard.files[0];
  if (file?.type.startsWith("image/")) {
    return normalizePastedImageFile(file);
  }

  return null;
}

export function AnnouncementRichTextEditor({ propertyId, value, onChange, disabled }: Props) {
  const t = useTranslations("announcements.editor");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const uploadingRef = useRef(false);
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadAndInsertImage = useCallback(
    async (file: File) => {
      const editorInstance = editorRef.current;
      if (!editorInstance || uploadingRef.current || disabledRef.current) {
        return;
      }

      setUploadError(null);
      uploadingRef.current = true;
      setUploadingImage(true);
      try {
        const formData = new FormData();
        formData.set("file", file);
        const result = await uploadAnnouncementImageAction(propertyId, formData);
        if (result.error) {
          setUploadError(result.error);
          return;
        }
        if (result.url) {
          editorInstance.chain().focus().setImage({ src: result.url, alt: file.name }).run();
        }
      } finally {
        uploadingRef.current = false;
        setUploadingImage(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [propertyId],
  );

  const uploadAndInsertImageRef = useRef(uploadAndInsertImage);
  uploadAndInsertImageRef.current = uploadAndInsertImage;

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "announcement-body-image",
        },
      }),
      Placeholder.configure({
        placeholder: t("placeholder"),
      }),
    ],
    content: value,
    onCreate: ({ editor: createdEditor }) => {
      editorRef.current = createdEditor;
    },
    onDestroy: () => {
      editorRef.current = null;
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "announcement-editor-content min-h-[180px] px-3 py-2 text-sm focus:outline-none prose-headings:font-semibold",
      },
      handlePaste: (_view, event) => {
        if (disabledRef.current || uploadingRef.current) {
          return false;
        }

        const imageFile = event.clipboardData ? extractImageFromClipboard(event.clipboardData) : null;
        if (!imageFile) {
          return false;
        }

        event.preventDefault();
        void uploadAndInsertImageRef.current(imageFile);
        return true;
      },
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }
    editorRef.current = editor;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  function setLink() {
    if (!editor) {
      return;
    }
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt(t("linkPrompt"), previousUrl ?? "https://");
    if (url === null) {
      return;
    }
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  if (!editor) {
    return null;
  }

  return (
    <div className="rounded-md border bg-background">
      <div className="flex flex-wrap items-center gap-0.5 border-b p-1">
        <ToolbarButton
          label={t("bold")}
          active={editor.isActive("bold")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("italic")}
          active={editor.isActive("italic")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("strike")}
          active={editor.isActive("strike")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="size-4" />
        </ToolbarButton>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <ToolbarButton
          label={t("heading2")}
          active={editor.isActive("heading", { level: 2 })}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("heading3")}
          active={editor.isActive("heading", { level: 3 })}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="size-4" />
        </ToolbarButton>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <ToolbarButton
          label={t("bulletList")}
          active={editor.isActive("bulletList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("orderedList")}
          active={editor.isActive("orderedList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("quote")}
          active={editor.isActive("blockquote")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="size-4" />
        </ToolbarButton>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <ToolbarButton label={t("link")} active={editor.isActive("link")} disabled={disabled} onClick={setLink}>
          <Link2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("image")}
          disabled={disabled || uploadingImage}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploadingImage ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
        </ToolbarButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void uploadAndInsertImage(file);
            }
          }}
        />
      </div>
      <EditorContent editor={editor} />
      {uploadError ? (
        <p className="px-3 pb-2 text-xs text-destructive">
          {t(`errors.${uploadError}`, { defaultMessage: uploadError })}
        </p>
      ) : null}
    </div>
  );
}
