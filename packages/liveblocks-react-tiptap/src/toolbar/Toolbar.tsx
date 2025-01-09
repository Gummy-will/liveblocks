import {
  BoldIcon,
  Button,
  CheckIcon,
  ChevronDownIcon,
  CodeIcon,
  CommentIcon,
  ItalicIcon,
  RedoIcon,
  ShortcutTooltip,
  StrikethroughIcon,
  TooltipProvider,
  UnderlineIcon,
  UndoIcon,
} from "@liveblocks/react-ui/_private";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import type { Editor } from "@tiptap/react";
import type { ComponentProps, ComponentType, ReactNode } from "react";
import { forwardRef, useContext, useMemo } from "react";

import { classNames } from "../classnames";
import { EditorProvider, useCurrentEditor } from "../context";
import type { ExtendedChainedCommands } from "../types";
import { FloatingToolbarContext } from "./FloatingToolbarContext";

export const BLOCK_SELECT_SIDE_OFFSET = 10;
export const FLOATING_ELEMENT_COLLISION_PADDING = 10;

export interface ToolbarSlotProps {
  editor: Editor;
}

export type ToolbarSlot = ReactNode | ComponentType<ToolbarSlotProps>;

export interface ToolbarProps extends Omit<ComponentProps<"div">, "children"> {
  editor: Editor | null;
  children?: ToolbarSlot;
  before?: ToolbarSlot;
  after?: ToolbarSlot;
}

interface ToolbarButtonProps extends ComponentProps<"button"> {
  icon?: ReactNode;
  name: string;
  shortcut?: string;
}

interface ToolbarToggleProps extends ToolbarButtonProps {
  active: boolean;
}

interface ToolbarBlockSelectorOption {
  name: string;
  isActive: (editor: Editor) => boolean;
  setActive: (editor: Editor) => void;
}

interface ToolbarBlockSelectorProps extends ComponentProps<"button"> {
  options?: ToolbarBlockSelectorOption[];
}

type ToolbarSeparatorProps = ComponentProps<"div">;

export function applyToolbarSlot(
  slot: ToolbarSlot,
  props: ToolbarSlotProps
): ReactNode {
  if (typeof slot === "function") {
    const Component = slot;

    return <Component {...props} />;
  }

  return slot;
}

const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ icon, children, name, shortcut, ...props }, forwardedRef) => {
    return (
      <ShortcutTooltip content={name} shortcut={shortcut}>
        <Button
          type="button"
          variant="toolbar"
          ref={forwardedRef}
          icon={icon}
          {...props}
        >
          {children}
        </Button>
      </ShortcutTooltip>
    );
  }
);

const ToolbarToggle = forwardRef<HTMLButtonElement, ToolbarToggleProps>(
  ({ active, ...props }, forwardedRef) => {
    return (
      <TogglePrimitive.Root asChild pressed={active}>
        <ToolbarButton ref={forwardedRef} {...props} />
      </TogglePrimitive.Root>
    );
  }
);

function createDefaultBlockSelectorOptions(
  editor: Editor
): ToolbarBlockSelectorOption[] {
  const options: (ToolbarBlockSelectorOption | null)[] = [
    "toggleHeading" in editor.commands
      ? {
          name: "Heading 1",
          isActive: (editor) => editor.isActive("heading", { level: 1 }),
          setActive: (editor) =>
            (
              editor.chain().focus().clearNodes() as ExtendedChainedCommands<
                "toggleHeading",
                [{ level: number }]
              >
            )
              .toggleHeading({ level: 1 })
              .run(),
        }
      : null,
    "toggleHeading" in editor.commands
      ? {
          name: "Heading 2",
          isActive: (editor) => editor.isActive("heading", { level: 2 }),
          setActive: (editor) =>
            (
              editor.chain().focus().clearNodes() as ExtendedChainedCommands<
                "toggleHeading",
                [{ level: number }]
              >
            )
              .toggleHeading({ level: 2 })
              .run(),
        }
      : null,
    "toggleHeading" in editor.commands
      ? {
          name: "Heading 3",
          isActive: (editor) => editor.isActive("heading", { level: 3 }),
          setActive: (editor) =>
            (
              editor.chain().focus().clearNodes() as ExtendedChainedCommands<
                "toggleHeading",
                [{ level: number }]
              >
            )
              .toggleHeading({ level: 3 })
              .run(),
        }
      : null,
    "toggleBulletList" in editor.commands
      ? {
          name: "Bullet list",
          isActive: (editor) => editor.isActive("bulletList"),
          setActive: (editor) =>
            (
              editor
                .chain()
                .focus()
                .clearNodes() as ExtendedChainedCommands<"toggleBulletList">
            )
              .toggleBulletList()
              .run(),
        }
      : null,
    "toggleOrderedList" in editor.commands
      ? {
          name: "Numbered list",

          isActive: (editor) => editor.isActive("orderedList"),
          setActive: (editor) =>
            (
              editor
                .chain()
                .focus()
                .clearNodes() as ExtendedChainedCommands<"toggleOrderedList">
            )
              .toggleOrderedList()
              .run(),
        }
      : null,
    "toggleBlockquote" in editor.commands
      ? {
          name: "Blockquote",
          isActive: (editor) => editor.isActive("blockquote"),
          setActive: (editor) =>
            (
              editor
                .chain()
                .focus()
                .clearNodes() as ExtendedChainedCommands<"toggleBlockquote">
            )
              .toggleBlockquote()
              .run(),
        }
      : null,
    "toggleCodeBlock" in editor.commands
      ? {
          name: "Code block",
          isActive: (editor) => editor.isActive("codeBlock"),
          setActive: (editor) =>
            (
              editor
                .chain()
                .focus()
                .clearNodes() as ExtendedChainedCommands<"toggleCodeBlock">
            )
              .toggleCodeBlock()
              .run(),
        }
      : null,
  ];

  return options.filter(Boolean) as ToolbarBlockSelectorOption[];
}

const blockSelectorTextOption: ToolbarBlockSelectorOption = {
  name: "Text",
  isActive: () => false,
  setActive: (editor) => editor.chain().focus().clearNodes().run(),
};

const ToolbarBlockSelector = forwardRef<
  HTMLButtonElement,
  ToolbarBlockSelectorProps
>(({ options, ...props }, forwardedRef) => {
  const floatingToolbarContext = useContext(FloatingToolbarContext);
  const editor = useCurrentEditor(
    "BlockSelector",
    "Toolbar or FloatingToolbar"
  );
  const resolvedOptions = useMemo(() => {
    const resolvedOptions =
      options ?? createDefaultBlockSelectorOptions(editor);

    return [blockSelectorTextOption, ...resolvedOptions];
  }, [editor, options]);
  const activeOption =
    resolvedOptions.find((option) => option.isActive(editor)) ??
    blockSelectorTextOption;

  const handleOptionChange = (name: string) => {
    const option = resolvedOptions.find((option) => option.name === name);

    if (option) {
      option.setActive(editor);

      // If present in a floating toolbar, close it on change
      floatingToolbarContext?.close();
    }
  };

  return (
    <SelectPrimitive.Root
      value={activeOption.name}
      onValueChange={handleOptionChange}
    >
      <ShortcutTooltip content="Turn into…">
        <SelectPrimitive.Trigger asChild {...props} ref={forwardedRef}>
          <Button type="button" variant="toolbar">
            <SelectPrimitive.Value>{activeOption.name}</SelectPrimitive.Value>
            <SelectPrimitive.Icon className="lb-dropdown-chevron">
              <ChevronDownIcon />
            </SelectPrimitive.Icon>
          </Button>
        </SelectPrimitive.Trigger>
      </ShortcutTooltip>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={BLOCK_SELECT_SIDE_OFFSET}
          collisionPadding={FLOATING_ELEMENT_COLLISION_PADDING}
          className="lb-root lb-portal lb-elevation lb-dropdown"
        >
          {resolvedOptions.map((option) => (
            <SelectPrimitive.Item
              key={option.name}
              value={option.name}
              className="lb-dropdown-item"
            >
              <SelectPrimitive.ItemText className="lb-dropdown-item-label">
                {option.name}
              </SelectPrimitive.ItemText>
              {option.name === activeOption.name ? (
                <span className="lb-dropdown-item-chevron">
                  <CheckIcon />
                </span>
              ) : null}
            </SelectPrimitive.Item>
          ))}
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
});

const ToolbarSeparator = forwardRef<HTMLDivElement, ToolbarSeparatorProps>(
  ({ className, ...props }, forwardedRef) => {
    return (
      <div
        ref={forwardedRef}
        role="separator"
        aria-orientation="vertical"
        className={classNames("lb-tiptap-toolbar-separator", className)}
        {...props}
      />
    );
  }
);

function ToolbarSectionHistory() {
  const editor = useCurrentEditor(
    "SectionHistory",
    "Toolbar or FloatingToolbar"
  );

  return (
    <>
      <ToolbarButton
        name="Undo"
        icon={<UndoIcon />}
        shortcut="Mod-Z"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
      />
      <ToolbarButton
        name="Redo"
        icon={<RedoIcon />}
        shortcut="Mod-Shift-Z"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
      />
    </>
  );
}

function ToolbarSectionInline() {
  const editor = useCurrentEditor(
    "SectionInline",
    "Toolbar or FloatingToolbar"
  );
  const supportsBold = "toggleBold" in editor.commands;
  const supportsItalic = "toggleItalic" in editor.commands;
  const supportsUnderline = "toggleUnderline" in editor.commands;
  const supportsStrike = "toggleStrike" in editor.commands;
  const supportsCode = "toggleCode" in editor.commands;

  return (
    <>
      {supportsBold && (
        <ToolbarToggle
          name="Bold"
          icon={<BoldIcon />}
          shortcut="Mod-B"
          onClick={() =>
            (editor.chain().focus() as ExtendedChainedCommands<"toggleBold">)
              .toggleBold()
              .run()
          }
          disabled={
            !(
              editor
                .can()
                .chain()
                .focus() as ExtendedChainedCommands<"toggleBold">
            )
              .toggleBold()
              .run()
          }
          active={editor.isActive("bold")}
        />
      )}
      {supportsItalic && (
        <ToolbarToggle
          name="Italic"
          icon={<ItalicIcon />}
          shortcut="Mod-I"
          onClick={() =>
            (editor.chain().focus() as ExtendedChainedCommands<"toggleItalic">)
              .toggleItalic()
              .run()
          }
          disabled={
            !(
              editor
                .can()
                .chain()
                .focus() as ExtendedChainedCommands<"toggleItalic">
            )
              .toggleItalic()
              .run()
          }
          active={editor.isActive("italic")}
        />
      )}
      {supportsUnderline && (
        <ToolbarToggle
          name="Underline"
          icon={<UnderlineIcon />}
          shortcut="Mod-U"
          onClick={() =>
            (
              editor
                .chain()
                .focus() as ExtendedChainedCommands<"toggleUnderline">
            )
              .toggleUnderline()
              .run()
          }
          disabled={
            !(
              editor
                .can()
                .chain()
                .focus() as ExtendedChainedCommands<"toggleUnderline">
            )
              .toggleUnderline()
              .run()
          }
          active={editor.isActive("underline")}
        />
      )}
      {supportsStrike && (
        <ToolbarToggle
          name="Strikethrough"
          icon={<StrikethroughIcon />}
          shortcut="Mod-U"
          onClick={() =>
            (editor.chain().focus() as ExtendedChainedCommands<"toggleStrike">)
              .toggleStrike()
              .run()
          }
          disabled={
            !(
              editor
                .can()
                .chain()
                .focus() as ExtendedChainedCommands<"toggleStrike">
            )
              .toggleStrike()
              .run()
          }
          active={editor.isActive("strike")}
        />
      )}
      {supportsCode && (
        <ToolbarToggle
          name="Inline code"
          icon={<CodeIcon />}
          shortcut="Mod-E"
          onClick={() =>
            (editor.chain().focus() as ExtendedChainedCommands<"toggleCode">)
              .toggleCode()
              .run()
          }
          disabled={
            !(
              editor
                .can()
                .chain()
                .focus() as ExtendedChainedCommands<"toggleCode">
            )
              .toggleCode()
              .run()
          }
          active={editor.isActive("code")}
        />
      )}
    </>
  );
}

function ToolbarSectionCollaboration() {
  const editor = useCurrentEditor(
    "SectionCollaboration",
    "Toolbar or FloatingToolbar"
  );
  const supportsThread = "addPendingComment" in editor.commands;

  return (
    <>
      {supportsThread && (
        <ToolbarButton
          name="Add a comment"
          icon={<CommentIcon />}
          onClick={() =>
            (
              editor
                .chain()
                .focus() as ExtendedChainedCommands<"addPendingComment">
            )
              .addPendingComment()
              .run()
          }
        >
          Comment
        </ToolbarButton>
      )}
    </>
  );
}

function DefaultToolbarContent({ editor }: ToolbarSlotProps) {
  const supportsThread = "addPendingComment" in editor.commands;

  return (
    <>
      <ToolbarSectionHistory />
      <ToolbarSeparator />
      <ToolbarBlockSelector />
      <ToolbarSectionInline />
      {supportsThread ? (
        <>
          <ToolbarSeparator />
          <ToolbarSectionCollaboration />
        </>
      ) : null}
    </>
  );
}

export const Toolbar = Object.assign(
  forwardRef<HTMLDivElement, ToolbarProps>(
    (
      {
        before,
        after,
        children = DefaultToolbarContent,
        editor,
        className,
        ...props
      },
      forwardedRef
    ) => {
      if (!editor) {
        return null;
      }

      const slotProps: ToolbarSlotProps = { editor };

      return (
        <TooltipProvider>
          <EditorProvider editor={editor}>
            <div
              ref={forwardedRef}
              role="toolbar"
              aria-label="Toolbar"
              aria-orientation="horizontal"
              className={classNames("lb-root lb-tiptap-toolbar", className)}
              {...props}
            >
              {applyToolbarSlot(before, slotProps)}
              {applyToolbarSlot(children, slotProps)}
              {applyToolbarSlot(after, slotProps)}
            </div>
          </EditorProvider>
        </TooltipProvider>
      );
    }
  ),
  {
    Button: ToolbarButton,
    Toggle: ToolbarToggle,
    Separator: ToolbarSeparator,
    SectionHistory: ToolbarSectionHistory,
    SectionInline: ToolbarSectionInline,
    SectionCollaboration: ToolbarSectionCollaboration,
    BlockSelector: ToolbarBlockSelector,
  }
);
