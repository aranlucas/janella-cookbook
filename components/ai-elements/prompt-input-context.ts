"use client";

import type { FileUIPart, SourceDocumentUIPart } from "ai";
import { createContext, useContext, type RefObject } from "react";

export type PromptInputFile = FileUIPart & { id: string };

export type PromptInputSource = SourceDocumentUIPart & { id: string };

export interface AttachmentsContext {
  readonly files: readonly PromptInputFile[];
  readonly add: (files: readonly File[] | FileList) => void;
  readonly remove: (id: string) => void;
  readonly clear: () => void;
  readonly openFileDialog: () => void;
  readonly fileInputRef: RefObject<HTMLInputElement | null>;
}

export interface TextInputContext {
  readonly value: string;
  readonly setInput: (value: string) => void;
  readonly clear: () => void;
}

export interface PromptInputControllerProps {
  readonly textInput: TextInputContext;
  readonly attachments: AttachmentsContext;
  readonly registerFileInput: (ref: RefObject<HTMLInputElement | null>, open: () => void) => void;
}

export interface ReferencedSourcesContext {
  readonly sources: readonly PromptInputSource[];
  readonly add: (
    sources: readonly Readonly<SourceDocumentUIPart>[] | Readonly<SourceDocumentUIPart>,
  ) => void;
  readonly remove: (id: string) => void;
  readonly clear: () => void;
}

export const PromptInputController = createContext<PromptInputControllerProps | null>(null);

export const ProviderAttachmentsContext = createContext<AttachmentsContext | null>(null);

export const LocalAttachmentsContext = createContext<AttachmentsContext | null>(null);

export const LocalReferencedSourcesContext = createContext<ReferencedSourcesContext | null>(null);

export const usePromptInputController = () => {
  const context = useContext(PromptInputController);

  if (!context) {
    throw new Error(
      "Wrap your component inside <PromptInputProvider> to use usePromptInputController().",
    );
  }

  return context;
};

export const useOptionalPromptInputController = () => useContext(PromptInputController);

export const useProviderAttachments = () => {
  const context = useContext(ProviderAttachmentsContext);

  if (!context) {
    throw new Error(
      "Wrap your component inside <PromptInputProvider> to use useProviderAttachments().",
    );
  }

  return context;
};

export const useOptionalProviderAttachments = () => useContext(ProviderAttachmentsContext);

export const usePromptInputAttachments = () => {
  const provider = useOptionalProviderAttachments();
  const local = useContext(LocalAttachmentsContext);
  const context = local ?? provider;

  if (!context) {
    throw new Error(
      "usePromptInputAttachments must be used within a PromptInput or PromptInputProvider",
    );
  }

  return context;
};

export const usePromptInputReferencedSources = () => {
  const context = useContext(LocalReferencedSourcesContext);

  if (!context) {
    throw new Error(
      "usePromptInputReferencedSources must be used within a LocalReferencedSourcesContext.Provider",
    );
  }

  return context;
};
