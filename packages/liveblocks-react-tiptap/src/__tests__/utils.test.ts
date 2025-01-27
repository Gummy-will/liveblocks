import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";

import { getDocumentText } from "../utils";

// textBetween can return different lengths depending on the content (e.g. line breaks, paragraphs, etc)
const GET_DOCUMENT_TEXT_LENGTH_DELTA = 5;

expect.extend({
  toAlmostEqual(a: number, b: number, delta = 1) {
    return {
      pass: Math.abs(a - b) < delta,
      message: () => `Expected ${a} to be almost (±${delta}) equal to ${b}`,
    };
  },
});

type ExtendedExpect<T> = jest.JestMatchersShape<
  jest.Matchers<void, T> & {
    toAlmostEqual: (a: number, b: number, delta?: number) => boolean;
  },
  jest.Matchers<Promise<void>, T> & {
    toAlmostEqual: (a: number, b: number, delta?: number) => boolean;
  }
>;

describe("utils", () => {
  describe("getDocumentText", () => {
    let editor: Editor;

    beforeEach(() => {
      editor = new Editor({
        extensions: [Document, Text, Paragraph],
        // 2905 characters
        content:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque viverra aliquet magna, id faucibus mauris porta non. Maecenas nec varius ipsum. Ut magna erat, venenatis eu neque nec, bibendum blandit lorem. Aliquam neque risus, tempor sed volutpat eget, cursus at magna. Nullam eu metus orci. Aliquam bibendum pellentesque elit at feugiat. Sed elementum nisl eget ante commodo, pellentesque consectetur mi semper. Vivamus pharetra justo sed velit venenatis, sed lobortis lacus mollis. Mauris finibus dolor non turpis rutrum rhoncus a in lacus. Nunc tempor enim arcu, sit amet egestas urna imperdiet non. Fusce et eros tempus, eleifend leo nec, dictum augue. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Duis sit amet laoreet leo, ornare imperdiet massa. Cras iaculis ligula sed commodo suscipit. Donec sit amet sem ut diam ullamcorper pulvinar vel quis mauris. Sed accumsan finibus egestas. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Pellentesque viverra consectetur lectus vitae rhoncus. Maecenas hendrerit nulla id tristique ullamcorper. Suspendisse gravida dapibus ante volutpat convallis. Quisque enim lectus, lobortis vitae turpis ut, tempor semper lectus. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam in quam rhoncus, euismod leo nec, molestie risus. Phasellus eu urna sit amet massa ultrices semper. Integer id felis in lorem faucibus laoreet eu et nulla. Nulla tempor lobortis turpis, sed placerat nulla elementum eget. Vestibulum congue eleifend hendrerit. Curabitur maximus sit amet lectus ac dapibus. Suspendisse potenti. Pellentesque vel est molestie, posuere orci nec, finibus ligula. Aliquam erat volutpat. Proin justo diam, lobortis a imperdiet non, mollis quis massa. Mauris rhoncus scelerisque leo, vulputate tempor sem commodo id. Donec volutpat ante at massa mattis ultricies. Mauris quis egestas felis, non vulputate dolor. Maecenas egestas diam at arcu auctor sagittis. Nulla dignissim feugiat erat. Sed justo enim, tincidunt quis nunc vel, vestibulum euismod libero. Suspendisse dictum at lorem sit amet porta. Vestibulum vehicula mattis leo sit amet pulvinar. Maecenas in hendrerit magna. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras dignissim porttitor quam nec interdum. Sed posuere leo eget sodales dignissim. Mauris malesuada vel diam eget faucibus. Proin et hendrerit dui, ac porttitor nibh. Praesent efficitur mollis condimentum. Aliquam sit amet turpis in felis vulputate eleifend ut facilisis arcu. Praesent feugiat tincidunt metus quis pulvinar. Suspendisse augue odio, finibus a interdum a, porta et ipsum. Praesent sed orci eu quam auctor scelerisque. Nunc lacinia congue aliquam. Donec odio nisl, posuere et elementum luctus, commodo volutpat diam. Praesent luctus id lacus eu cursus. Sed nec dolor quis neque convallis cursus et quis diam.",
      });
    });

    afterEach(() => {
      editor.destroy();
    });

    test("should handle an empty selection", () => {
      // Set the selection to a single point in the middle of the document
      editor.commands.setTextSelection({
        from: editor.state.doc.content.size / 2,
        to: editor.state.doc.content.size / 2,
      });

      const text = getDocumentText(editor, 1000);

      (expect(text.length) as ExtendedExpect<number>).toAlmostEqual(
        1000,
        GET_DOCUMENT_TEXT_LENGTH_DELTA
      );
      expect(text).toMatchSnapshot();
    });

    test("should prioritize the selection", () => {
      // Select 200 characters in the middle of the document
      editor.commands.setTextSelection({
        from: editor.state.doc.content.size / 2 - 100,
        to: editor.state.doc.content.size / 2 + 100,
      });

      const selectionText = editor.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to,
        " "
      );
      const text = getDocumentText(editor, 200);

      (expect(text.length) as ExtendedExpect<number>).toAlmostEqual(
        200,
        GET_DOCUMENT_TEXT_LENGTH_DELTA
      );
      expect(text.includes(selectionText)).toBeTruthy();
    });

    test("should truncate the selection if it is too large", () => {
      // Select the entire document
      editor.commands.setTextSelection({
        from: 0,
        to: editor.state.doc.content.size,
      });

      const text = getDocumentText(editor, 1000);

      (expect(text.length) as ExtendedExpect<number>).toAlmostEqual(
        1000,
        GET_DOCUMENT_TEXT_LENGTH_DELTA
      );
      expect(text).toMatchSnapshot();
    });

    test("should take into account the document size", () => {
      // Select from the 100th character to the 50th character from the end
      editor.commands.setTextSelection({
        from: 100,
        to: editor.state.doc.content.size - 50,
      });

      const text = getDocumentText(editor, 10000);

      (expect(text.length) as ExtendedExpect<number>).toAlmostEqual(
        editor.state.doc.content.size,
        GET_DOCUMENT_TEXT_LENGTH_DELTA
      );
      expect(text).toMatchSnapshot();
    });

    test("should balance the available length equally on both sides of the selection", () => {
      // Select 200 characters in the middle of the document
      editor.commands.setTextSelection({
        from: editor.state.doc.content.size / 2 - 100,
        to: editor.state.doc.content.size / 2 + 100,
      });

      const text = getDocumentText(editor, 1000);

      (expect(text.length) as ExtendedExpect<number>).toAlmostEqual(
        1000,
        GET_DOCUMENT_TEXT_LENGTH_DELTA
      );
      expect(text).toMatchSnapshot();
    });

    test("should compensate after the selection if before is not enough", () => {
      // Select the first 200 characters
      editor.commands.setTextSelection({
        from: 0,
        to: 200,
      });

      const text = getDocumentText(editor, 1000);

      (expect(text.length) as ExtendedExpect<number>).toAlmostEqual(
        1000,
        GET_DOCUMENT_TEXT_LENGTH_DELTA
      );
      expect(text).toMatchSnapshot();
    });

    test("should compensate before the selection if after is not enough", () => {
      // Select 200 characters near the end of the document
      editor.commands.setTextSelection({
        from: editor.state.doc.content.size - 350,
        to: editor.state.doc.content.size - 150,
      });

      const text = getDocumentText(editor, 1000);

      (expect(text.length) as ExtendedExpect<number>).toAlmostEqual(
        1000,
        GET_DOCUMENT_TEXT_LENGTH_DELTA
      );
      expect(text).toMatchSnapshot();
    });
  });
});
