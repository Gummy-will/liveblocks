"use client";

import {
  useInboxNotifications,
  ClientSideSuspense,
  useInboxNotificationThread,
  useUser,
  useMarkAllInboxNotificationsAsRead,
  useDeleteAllInboxNotifications,
} from "@liveblocks/react/suspense";
import { InboxNotificationList } from "@liveblocks/react-ui";
import { ErrorBoundary } from "react-error-boundary";
import { InboxNotificationData, stringifyCommentBody } from "@liveblocks/core";
import { Avatar } from "@/components/Avatar";
import classNames from "classnames";
import { useRoomInfo } from "@liveblocks/react";
import Link from "next/link";

export function Inbox() {
  return (
    <ErrorBoundary fallback={<div>Error</div>}>
      <ClientSideSuspense fallback={null}>
        <InboxNotifications />
      </ClientSideSuspense>
    </ErrorBoundary>
  );
}

function InboxNotifications() {
  const { inboxNotifications } = useInboxNotifications();
  const deleteAll = useDeleteAllInboxNotifications();
  const markAsRead = useMarkAllInboxNotificationsAsRead();

  return (
    <div className="">
      <div className="flex items-center justify-between px-4 text-sm border-b h-10">
        <div>Inbox</div>
        <div className="flex gap-2 text-xl">
          <button onClick={markAsRead}>✓</button>
          <button onClick={deleteAll}>✗</button>
        </div>
      </div>
      <InboxNotificationList>
        {inboxNotifications.map((inboxNotification, index) => (
          <SmallInboxNotification
            key={inboxNotification.id}
            inboxNotification={inboxNotification}
            selected={index === 0}
          />
        ))}
      </InboxNotificationList>
    </div>
  );
}

function SmallInboxNotification({
  inboxNotification,
  selected,
}: {
  inboxNotification: InboxNotificationData;
  selected: boolean;
}) {
  const thread = useInboxNotificationThread(inboxNotification.id);
  const { user } = useUser(thread.comments[0].userId);
  const { info, error, isLoading } = useRoomInfo(
    inboxNotification?.roomId || ""
  );

  if (
    !thread.comments[0].body ||
    isLoading ||
    error ||
    !info.metadata.issueId
  ) {
    return null;
  }

  return (
    <Link href={`/issue/${info?.metadata.issueId}`}>
      <div
        className={classNames(
          "flex flex-row items-center px-3 py-2.5 gap-2 m-1 rounded",
          {
            "bg-neutral-200/40": selected,
          }
        )}
      >
        <div className="h-8 w-8">
          <div className="rounded-full overflow-hidden">
            <Avatar userId={thread.comments[0].userId} />
          </div>
        </div>
        <div className="flex-grow w-full overflow-hidden">
          <div className="font-medium text-neutral-700 truncate">
            {info.metadata.title}
          </div>
          <div className="text-xs text-neutral-400 w-full truncate">
            {user.name} commented:{" "}
            {stringifyCommentBody(thread.comments[0].body)}
          </div>
        </div>
      </div>
    </Link>
  );
}
