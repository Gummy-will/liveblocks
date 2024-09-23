import { Liveblocks } from "@liveblocks/node";
import { http, HttpResponse } from "msw";

import type {
  CommentEmailBaseData,
  ThreadNotificationBaseData,
  ThreadNotificationData,
} from "../thread-notification";
import {
  extractThreadNotificationData,
  getLastUnreadCommentWithMention,
  getUnreadComments,
  makeCommentEmailBaseData,
  prepareThreadNotificationEmailBaseData,
} from "../thread-notification";
import {
  buildCommentBodyWithMention,
  commentBody1,
  commentBody2,
  commentBody3,
  generateThreadId,
  getResolvedCommentUrl,
  makeComment,
  makeCommentWithBody,
  makeThread,
  makeThreadInboxNotification,
  makeThreadNotificationEvent,
  RESOLVED_ROOM_INFO_TEST,
  resolveRoomInfo,
  ROOM_ID_TEST,
  server,
  SERVER_BASE_URL,
} from "./_helpers";

describe("thread notification", () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  const client = new Liveblocks({ secret: "sk_xxx" });

  describe("internals utils", () => {
    it("should get unread comments ", () => {
      const threadId = generateThreadId();
      const comment1 = makeComment({
        userId: "user-dracula",
        threadId,
        body: commentBody1,
        createdAt: new Date("2024-09-10T08:10:00.000Z"),
      });
      const comment2 = makeComment({
        userId: "user-mina",
        threadId,
        body: commentBody2,
        createdAt: new Date("2024-09-10T08:14:00.000Z"),
      });
      const comment3 = makeComment({
        userId: "user-carmilla",
        threadId,
        body: commentBody3,
        createdAt: new Date("2024-09-10T08:16:00.000Z"),
      });
      const inboxNotification = makeThreadInboxNotification({
        threadId,
        notifiedAt: new Date("2024-09-10T08:20:00.000Z"),
      });

      const expected = [comment2, comment3];
      const unreadComments = getUnreadComments({
        comments: [comment1, comment2, comment3],
        inboxNotification,
        userId: "user-dracula",
      });
      expect(unreadComments).toEqual(expected);
    });

    it("should get last unread comment with mention", () => {
      const threadId = generateThreadId();
      const comment1 = makeComment({
        userId: "user-dracula",
        threadId,
        body: buildCommentBodyWithMention({ mentionedUserId: "user-mina" }),
        createdAt: new Date("2024-09-10T08:10:00.000Z"),
      });
      const comment2 = makeComment({
        userId: "user-carmilla",
        threadId,
        body: commentBody1,
        createdAt: new Date("2024-09-10T08:12:00.000Z"),
      });

      const inboxNotification = makeThreadInboxNotification({
        threadId,
        notifiedAt: new Date("2024-09-10T08:20:00.000Z"),
      });

      const unreadComments1 = getUnreadComments({
        comments: [comment1, comment2],
        inboxNotification,
        userId: "user-mina",
      });
      const unreadComments2 = getUnreadComments({
        comments: [comment1, comment2],
        inboxNotification,
        userId: "user-dracula",
      });

      const lastCommentWithMention1 = getLastUnreadCommentWithMention({
        comments: unreadComments1,
        mentionedUserId: "user-mina",
      });
      const lastCommentWithMention2 = getLastUnreadCommentWithMention({
        comments: unreadComments2,
        mentionedUserId: "user-dracula",
      });

      expect(lastCommentWithMention1).toEqual(comment1);
      expect(lastCommentWithMention2).toBe(null);
    });

    it("should extract last unread comment with a mention from a thread notification", async () => {
      const threadId = generateThreadId();
      const comment = makeComment({
        userId: "user-0",
        threadId,
        body: buildCommentBodyWithMention({ mentionedUserId: "user-1" }),
        createdAt: new Date("2024-09-10T08:04:00.000Z"),
      });
      const thread = makeThread({ threadId, comments: [comment] });
      const inboxNotification = makeThreadInboxNotification({
        threadId,
        notifiedAt: new Date("2024-09-10T08:10:00.000Z"),
      });

      server.use(
        http.get(`${SERVER_BASE_URL}/v2/rooms/:roomId/threads/:threadId`, () =>
          HttpResponse.json(thread, { status: 200 })
        )
      );

      server.use(
        http.get(
          `${SERVER_BASE_URL}/v2/users/:userId/inbox-notifications/:notificationId`,
          () => HttpResponse.json(inboxNotification, { status: 200 })
        )
      );

      const event = makeThreadNotificationEvent({
        threadId,
        userId: "user-1",
        inboxNotificationId: inboxNotification.id,
      });

      const extracted = await extractThreadNotificationData({ client, event });
      const expected: ThreadNotificationData = {
        type: "unreadMention",
        comment: makeCommentWithBody({ comment }),
      };
      expect(extracted).toEqual(expected);
    });

    it("should extract unread replies comments from a thread notification", async () => {
      const threadId = generateThreadId();
      const comment1 = makeComment({
        userId: "user-dracula",
        threadId,
        body: commentBody1,
        createdAt: new Date("2024-09-10T08:10:00.000Z"),
      });
      const comment2 = makeComment({
        userId: "user-mina",
        threadId,
        body: commentBody2,
        createdAt: new Date("2024-09-10T08:14:00.000Z"),
      });
      const comment3 = makeComment({
        userId: "user-carmilla",
        threadId,
        body: commentBody3,
        createdAt: new Date("2024-09-10T08:16:00.000Z"),
      });
      const thread = makeThread({
        threadId,
        comments: [comment1, comment2, comment3],
      });
      const inboxNotification = makeThreadInboxNotification({
        threadId,
        notifiedAt: new Date("2024-09-10T08:20:00.000Z"),
      });

      server.use(
        http.get(`${SERVER_BASE_URL}/v2/rooms/:roomId/threads/:threadId`, () =>
          HttpResponse.json(thread, { status: 200 })
        )
      );

      server.use(
        http.get(
          `${SERVER_BASE_URL}/v2/users/:userId/inbox-notifications/:notificationId`,
          () => HttpResponse.json(inboxNotification, { status: 200 })
        )
      );

      const event = makeThreadNotificationEvent({
        threadId,
        userId: "user-dracula",
        inboxNotificationId: inboxNotification.id,
      });
      const extracted = await extractThreadNotificationData({ client, event });
      const expected: ThreadNotificationData = {
        type: "unreadReplies",
        comments: [
          makeCommentWithBody({ comment: comment2 }),
          makeCommentWithBody({ comment: comment3 }),
        ],
      };
      expect(extracted).toEqual(expected);
    });

    it("should make a comment email raw data", () => {
      const threadId = generateThreadId();
      const comment = makeComment({
        userId: "user-0",
        threadId,
        body: commentBody1,
      });

      const commentWithBody = makeCommentWithBody({ comment });
      const commentEmailBaseData1 = makeCommentEmailBaseData({
        roomInfo: undefined,
        comment: commentWithBody,
      });
      const commentEmailBaseData2 = makeCommentEmailBaseData({
        roomInfo: RESOLVED_ROOM_INFO_TEST,
        comment: commentWithBody,
      });

      const expected1: CommentEmailBaseData = {
        id: commentWithBody.id,
        userId: commentWithBody.userId,
        threadId: commentWithBody.threadId,
        roomId: commentWithBody.roomId,
        createdAt: commentWithBody.createdAt,
        url: undefined,
        rawBody: commentWithBody.body,
      };

      const expected2: CommentEmailBaseData = {
        id: commentWithBody.id,
        userId: commentWithBody.userId,
        threadId: commentWithBody.threadId,
        roomId: commentWithBody.roomId,
        createdAt: commentWithBody.createdAt,
        url: getResolvedCommentUrl(commentWithBody.id),
        rawBody: commentWithBody.body,
      };

      expect(commentEmailBaseData1).toEqual(expected1);
      expect(commentEmailBaseData2).toEqual(expected2);
    });
  });

  describe("prepare thread notification email data", () => {
    it("should prepare for last unread comment with mention", async () => {
      const threadId = generateThreadId();
      const comment = makeComment({
        userId: "user-0",
        threadId,
        body: buildCommentBodyWithMention({ mentionedUserId: "user-1" }),
        createdAt: new Date("2024-09-10T08:04:00.000Z"),
      });
      const thread = makeThread({ threadId, comments: [comment] });
      const inboxNotification = makeThreadInboxNotification({
        threadId,
        notifiedAt: new Date("2024-09-10T08:10:00.000Z"),
      });

      server.use(
        http.get(`${SERVER_BASE_URL}/v2/rooms/:roomId/threads/:threadId`, () =>
          HttpResponse.json(thread, { status: 200 })
        )
      );

      server.use(
        http.get(
          `${SERVER_BASE_URL}/v2/users/:userId/inbox-notifications/:notificationId`,
          () => HttpResponse.json(inboxNotification, { status: 200 })
        )
      );

      const event = makeThreadNotificationEvent({
        threadId,
        userId: "user-1",
        inboxNotificationId: inboxNotification.id,
      });

      const [preparedWithUnresolvedRoomInfo, preparedWithResolvedRoomInfo] =
        await Promise.all([
          prepareThreadNotificationEmailBaseData({ client, event }),
          prepareThreadNotificationEmailBaseData({
            client,
            event,
            options: { resolveRoomInfo },
          }),
        ]);
      const expectedComment = makeCommentWithBody({ comment });
      const expected1: ThreadNotificationBaseData = {
        type: "unreadMention",
        comment: makeCommentEmailBaseData({
          roomInfo: undefined,
          comment: expectedComment,
        }),
        roomInfo: {
          name: ROOM_ID_TEST,
        },
      };
      const expected2: ThreadNotificationBaseData = {
        type: "unreadMention",
        comment: makeCommentEmailBaseData({
          roomInfo: RESOLVED_ROOM_INFO_TEST,
          comment: expectedComment,
        }),
        roomInfo: RESOLVED_ROOM_INFO_TEST,
      };
      expect(preparedWithUnresolvedRoomInfo).toEqual(expected1);
      expect(preparedWithResolvedRoomInfo).toEqual(expected2);
    });

    it("should prepare for unread replies comments", async () => {
      const threadId = generateThreadId();
      const comment1 = makeComment({
        userId: "user-dracula",
        threadId,
        body: commentBody1,
        createdAt: new Date("2024-09-10T08:10:00.000Z"),
      });
      const comment2 = makeComment({
        userId: "user-mina",
        threadId,
        body: commentBody2,
        createdAt: new Date("2024-09-10T08:14:00.000Z"),
      });
      const comment3 = makeComment({
        userId: "user-carmilla",
        threadId,
        body: commentBody3,
        createdAt: new Date("2024-09-10T08:16:00.000Z"),
      });
      const thread = makeThread({
        threadId,
        comments: [comment1, comment2, comment3],
      });
      const inboxNotification = makeThreadInboxNotification({
        threadId,
        notifiedAt: new Date("2024-09-10T08:20:00.000Z"),
      });

      server.use(
        http.get(`${SERVER_BASE_URL}/v2/rooms/:roomId/threads/:threadId`, () =>
          HttpResponse.json(thread, { status: 200 })
        )
      );

      server.use(
        http.get(
          `${SERVER_BASE_URL}/v2/users/:userId/inbox-notifications/:notificationId`,
          () => HttpResponse.json(inboxNotification, { status: 200 })
        )
      );

      const event = makeThreadNotificationEvent({
        threadId,
        userId: "user-dracula",
        inboxNotificationId: inboxNotification.id,
      });

      const [preparedWithUnresolvedRoomInfo, preparedWithResolvedRoomInfo] =
        await Promise.all([
          prepareThreadNotificationEmailBaseData({ client, event }),
          prepareThreadNotificationEmailBaseData({
            client,
            event,
            options: { resolveRoomInfo },
          }),
        ]);
      const expectedComments = [
        makeCommentWithBody({ comment: comment2 }),
        makeCommentWithBody({ comment: comment3 }),
      ];

      const expected1: ThreadNotificationBaseData = {
        type: "unreadReplies",
        comments: expectedComments.map((c) =>
          makeCommentEmailBaseData({ roomInfo: undefined, comment: c })
        ),
        roomInfo: {
          name: ROOM_ID_TEST,
        },
      };

      const expected2: ThreadNotificationBaseData = {
        type: "unreadReplies",
        comments: expectedComments.map((c) =>
          makeCommentEmailBaseData({
            roomInfo: RESOLVED_ROOM_INFO_TEST,
            comment: c,
          })
        ),
        roomInfo: RESOLVED_ROOM_INFO_TEST,
      };

      expect(preparedWithUnresolvedRoomInfo).toEqual(expected1);
      expect(preparedWithResolvedRoomInfo).toEqual(expected2);
    });
  });
});
