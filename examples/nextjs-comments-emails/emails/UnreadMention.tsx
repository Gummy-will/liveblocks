import { CommentEmailAsReactData } from "@liveblocks/emails";
import { Section, Text } from "@react-email/components";
import { getProps } from "./_utils/getProps";
import { EmailRoot } from "./_components/email-root";
import { CompanyRow } from "./_components/company-row";
import { Comment } from "./_components/comment";
import { Headline } from "./_components/headline";

type RoomInfo = {
  name?: string;
  url?: string;
};

type EmailProps = {
  company: {
    name: string;
    url: string;
  };
  roomInfo: RoomInfo;
  comment: CommentEmailAsReactData;
};

const previewProps: EmailProps = {
  company: {
    name: "Acme Inc.",
    url: "https://liveblocks.io/comments",
  },
  roomInfo: {
    name: "🏃🏻 2024 races",
    url: "https://liveblocks.io/comments?room_id=2024-races",
  },
  comment: {
    id: "cm_2",
    threadId: "th_1",
    createdAt: new Date(2024, 2, 4, 4, 6, 47),
    author: {
      id: "emil-joyce@my-liveblocks-app.com",
      info: {
        name: "Emil Joyce",
        color: "#8594F0",
        avatar: "https://liveblocks.io/avatars/avatar-6.png",
      },
    },
    reactBody: (
      <Text className="text-sm m-0 mb-4">
        <span>
          For the user research phase, we'll need{" "}
          <span data-mention className="text-[#1667FF] font-medium">
            @Quinn Elton
          </span>{" "}
          to lead the interviews and compile the findings. His expertise in
          qualitative research will be crucial for this stage.
        </span>
      </Text>
    ),
    url: "https://liveblocks.io?room_id=2024-races#cm_2",
    roomId: "2024-races",
  },
};

const getPreviewText = (
  comment: CommentEmailAsReactData,
  roomName: RoomInfo["name"]
): string => {
  const author = comment.author;
  return `${author.info.name} mentioned you in ${roomName ?? "unknown room"}`;
};

const getHeadlineParts = (
  comment: CommentEmailAsReactData,
  roomName: RoomInfo["name"]
): [string, string, string] => {
  const author = comment.author;

  return [author.info.name, "mentioned you in", roomName ?? "unknown room"];
};

export default function Email(props: EmailProps) {
  const { company, roomInfo, comment } = getProps(props, previewProps);

  const previewText = getPreviewText(comment, roomInfo.name);
  const headlineParts = getHeadlineParts(comment, roomInfo.name);
  return (
    <EmailRoot preview={previewText}>
      <CompanyRow name={company.name} url={company.url} variant="header" />
      <Section className="my-12">
        <Headline>
          {headlineParts[0]}{" "}
          <span className="font-normal">{headlineParts[1]}</span>{" "}
          {headlineParts[2]}
        </Headline>
        <Comment {...comment} />
        <CompanyRow name={company.name} url={company.url} variant="footer" />
      </Section>
    </EmailRoot>
  );
}
