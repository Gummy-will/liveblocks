import { useRoom } from "@liveblocks/react";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import { Extension, mergeAttributes, Mark } from "@tiptap/core";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import {
  createAbsolutePositionFromRelativePosition,
  Doc,
  RelativePosition,
} from "yjs";
import { Plugin, PluginKey, SelectionBookmark } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import {
  ySyncPluginKey,
  relativePositionToAbsolutePosition,
} from "y-prosemirror";

const providersMap = new Map<
  string,
  LiveblocksYjsProvider<any, any, any, any, any>
>();

const docMap = new Map<string, Doc>();

type LiveblocksExtensionOptions = {
  field?: string;
};

const ACTIVE_SELECTOR_PLUGIN_KEY = new PluginKey(
  "lb-comment-active-selection-decorator"
);

const COMMENT_PLUGIN_KEY = new PluginKey("lb-comment");

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    comments: {
      /**
       * Add a comment
       */
      addComment: (id: string) => ReturnType;
    };

    liveblocks: {
      addPendingComment: () => ReturnType;
    };
  }
}

const Comment = Mark.create({
  name: "lb-comment",
  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },
  addAttributes() {
    // Return an object with attribute configuration
    return {
      commentId: {
        parseHTML: (element) => element.getAttribute("data-lb-comment-id"),
        renderHTML: (attributes) => {
          return {
            "data-lb-comment-id": attributes.commentId,
          };
        },
        default: "unset",
      },
    };
  },

  addCommands() {
    return {
      addComment:
        (id: string) =>
        ({ commands }) => {
          if (
            !this.editor.storage.liveblocksExtension.pendingCommentSelection
          ) {
            return false;
          }
          /*this.editor.state.selection = (
            this.editor.storage.liveblocksExtension
              .pendingCommentSelection as SelectionBookmark
          ).resolve(this.editor.state.doc);
          commands.setMark(this.name, { commentId: id });*/
          this.editor.storage.liveblocksExtension.pendingCommentSelection =
            null;
          return true;
        },
    };
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    const elem = document.createElement("span");

    Object.entries(
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)
    ).forEach(([attr, val]) => elem.setAttribute(attr, val));
    elem.classList.add("lb-comment");
    elem.addEventListener("click", () => {
      // elem.getAttribute("data-lb-comment-id")
    });

    return elem;
  },
});

const LiveblocksCollab = Collaboration.extend({
  // Override the onCreate method to warn users about potential misconfigurations
  onCreate() {
    if (
      !this.editor.extensionManager.extensions.find((e) => e.name === "doc")
    ) {
      console.warn(
        "[Liveblocks] The tiptap document extension is required for Liveblocks collaboration. Please add it or use Tiptap StarterKit extension."
      );
    }
    if (
      !this.editor.extensionManager.extensions.find(
        (e) => e.name === "paragraph"
      )
    ) {
      console.warn(
        "[Liveblocks] The tiptap paragraph extension is required for Liveblocks collaboration. Please add it or use Tiptap StarterKit extension."
      );
    }

    if (
      !this.editor.extensionManager.extensions.find((e) => e.name === "text")
    ) {
      console.warn(
        "[Liveblocks] The tiptap text extension is required for Liveblocks collaboration. Please add it or use Tiptap StarterKit extension."
      );
    }
    if (
      this.editor.extensionManager.extensions.find((e) => e.name === "history")
    ) {
      console.warn(
        "[Liveblocks] The history extension is enabled, Liveblocks extension provides its own. Please remove or disable the History plugin to prevent unwanted conflicts."
      );
    }
  },
});

// TODO: move options to `addOptions` of the extension itself
export const useLiveblocksExtension = ({
  field,
}: LiveblocksExtensionOptions = {}): Extension => {
  const room = useRoom();

  return Extension.create({
    name: "liveblocksExtension",
    // @ts-ignore I have no idea why TS doesn't like this
    onSelectionUpdate({ transaction }) {
      // ignore changes made by yjs
      if (transaction.getMeta(ySyncPluginKey)) {
        return;
      }
      this.storage.pendingCommentSelection = null;
      console.log("selection updated");
    },
    onCreate() {
      const self = room.getSelf();
      if (self?.info) {
        this.editor.commands.updateUser({
          name: self.info.name,
          color: self.info.color,
        });
      }
      this.storage.unsub = room.events.self.subscribe(({ info }) => {
        // TODO: maybe we need a deep compare here so other info can be provided
        const { name, color } = info;
        const { user } = this.storage.provider.awareness.getLocalState();
        if (name != user.name || color != user.color) {
          this.editor.commands.updateUser({ name, color });
        }
      });
    },
    onDestroy() {
      this.storage.unsub();
    },
    addStorage() {
      if (!providersMap.has(room.id)) {
        const doc = new Doc();
        docMap.set(room.id, doc);
        providersMap.set(room.id, new LiveblocksYjsProvider(room as any, doc));
      }
      return {
        doc: docMap.get(room.id),
        provider: providersMap.get(room.id),
        unsub: () => {},
        pendingCommentSelection: null,
        threads: [],
      };
    },
    addExtensions() {
      const options = field !== undefined ? { field } : {};
      return [
        Comment,
        LiveblocksCollab.configure({
          document: this.storage.doc,
          ...options,
        }),
        CollaborationCursor.configure({
          provider: this.storage.provider, //todo change the ! to an assert
        }),
      ];
    },

    addCommands() {
      return {
        addPendingComment: () => () => {
          if (this.editor.state.selection.empty) {
            return false;
          }
          this.storage.pendingCommentSelection =
            this.editor.state.selection.getBookmark();
          return true;
        },
      };
    },

    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: COMMENT_PLUGIN_KEY,
          props: {
            decorations: (state) => {
              if (this.storage.threads.length === 0) {
                return DecorationSet.create(state.doc, []);
              }

              const ystate = ySyncPluginKey.getState(state);
              try {
                const decorations: Decoration[] = [];
                this.storage.threads.forEach(
                  (thread: {
                    anchor: RelativePosition;
                    head: RelativePosition;
                    id: string;
                  }) => {
                    let anchor = relativePositionToAbsolutePosition(
                      ystate.doc,
                      ystate.type,
                      thread.anchor,
                      ystate.binding.mapping
                    );
                    let head = relativePositionToAbsolutePosition(
                      ystate.doc,
                      ystate.type,
                      thread.head,
                      ystate.binding.mapping
                    );

                    if (anchor !== null && head !== null) {
                      console.log(anchor, head);
                      const maxsize = Math.max(state.doc.content.size - 1, 0);
                      anchor = Math.min(anchor, maxsize); // clamp to max size
                      head = Math.min(head, maxsize); // clamp to max size
                      const from = Math.min(anchor, head);
                      const to = Math.max(anchor, head);

                      console.log(from, to);

                      decorations.push(
                        Decoration.inline(
                          from,
                          to,
                          {
                            class: "lb-comment",
                            "data-dat-comment": thread.id,
                          },
                          {
                            inclusiveEnd: true,
                            inclusiveStart: false,
                          }
                        )
                      );
                    }
                  }
                );
                return DecorationSet.create(state.doc, decorations);
              } catch (e) {
                console.log(e);
                return DecorationSet.create(state.doc, []);
              }
            },
          },
        }),
        new Plugin({
          key: ACTIVE_SELECTOR_PLUGIN_KEY,
          props: {
            decorations: ({ doc }) => {
              const active = this.storage.pendingCommentSelection != null;
              if (!active) {
                return DecorationSet.create(doc, []);
              }
              const { from, to } = (
                this.storage.pendingCommentSelection as SelectionBookmark
              ).resolve(doc);
              const decorations: Decoration[] = [
                Decoration.inline(from, to, {
                  class: "lb-comment-active-selection",
                }),
              ];
              return DecorationSet.create(doc, decorations);
            },
          },
        }),
      ];
    },
  });
};
