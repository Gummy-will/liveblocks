import { detectDupes } from "@liveblocks/core";

import type { AiCommands, CommentsCommands } from "./types";
import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export { AiToolbar } from "./ai/AiToolbar";
export { AnchoredThreads } from "./comments/AnchoredThreads";
export { FloatingComposer } from "./comments/FloatingComposer";
export { FloatingThreads } from "./comments/FloatingThreads";
export { useLiveblocksExtension } from "./LiveblocksExtension";
export { useIsEditorReady } from "./LiveblocksExtension";
export { FloatingToolbar } from "./toolbar/FloatingToolbar";
export { Toolbar } from "./toolbar/Toolbar";
export { HistoryVersionPreview } from "./version-history/HistoryVersionPreview";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    liveblocksComments: CommentsCommands<ReturnType>;
    liveblocksAi: AiCommands<ReturnType>;
  }
}
