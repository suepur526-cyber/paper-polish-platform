import { describe, expect, it } from "vitest";
import {
  classifyParagraph,
  detectNumberingPrefix,
  isCaptionLine,
  isCodeLikeParagraph,
  isReferenceEntry,
  isLikelyHeading,
  isTocEntry,
  shouldSkipParagraph
} from "@/lib/document/classifier";
import { parseParagraphLines } from "@/lib/document/parser";

describe("document classifier", () => {
  it("skips headings", () => {
    const result = classifyParagraph({ text: "第一章 绪论", styleName: "Heading 1", index: 0 });
    expect(result.type).toBe("heading");
    expect(result.selected).toBe(false);
  });

  it("selects body paragraphs", () => {
    const result = classifyParagraph({
      text: "数字化转型在企业管理中发挥着重要作用，并逐渐影响组织结构。",
      styleName: "Normal",
      index: 3
    });
    expect(result.type).toBe("body");
    expect(result.selected).toBe(true);
  });

  it("detects protected numbering prefix", () => {
    expect(detectNumberingPrefix("（1）研究对象具有代表性。")).toBe("（1）");
  });

  it("skips references", () => {
    expect(shouldSkipParagraph("参考文献")).toBe("参考文献默认跳过");
  });

  it("skips real-paper cover and declaration metadata", () => {
    const examples = [
      "本科毕业论文（设计）",
      "学院名称：计算机学院",
      "毕业论文原创性声明",
      "论文作者（签名）： 指导教师确认（签名）：",
      "2026年5月3日"
    ];

    for (const text of examples) {
      const result = classifyParagraph({ text, index: 0, phase: "frontMatter" });
      expect(result.selected).toBe(false);
      expect(result.type).toBe("skipped");
    }
  });

  it("keeps abstract headings and keywords out of rewriting", () => {
    expect(classifyParagraph({ text: "摘    要", index: 5 }).type).toBe("heading");
    expect(
      classifyParagraph({
        text: "关键词：血细胞检测；YOLOv8；深度学习；PyQt5；OpenCV",
        index: 7,
        phase: "abstract"
      })
    ).toMatchObject({ type: "keywords", selected: false });
    expect(
      classifyParagraph({
        text: "Keywords: blood cell detection; YOLOv8; deep learning",
        index: 8,
        phase: "abstract"
      })
    ).toMatchObject({ type: "keywords", selected: false });
  });

  it("distinguishes table-of-contents entries from real headings", () => {
    expect(classifyParagraph({ text: "目 录", index: 10 })).toMatchObject({
      type: "heading",
      selected: false
    });
    expect(isTocEntry("1 引言 1")).toBe(true);
    expect(isTocEntry("1.1 研究背景及意义 2")).toBe(true);
    expect(isLikelyHeading("1 引言")).toBe(true);
    expect(isLikelyHeading("1.1 研究背景及意义")).toBe(true);
  });

  it("does not turn chapter summary sentences into headings", () => {
    expect(isLikelyHeading("第一章主要对系统研究背景、研究意义以及相关内容进行了说明。")).toBe(
      false
    );
    expect(
      classifyParagraph({
        text: "人工智能技术在临床医学领域应用广泛，为血细胞检测提供了新的技术路径。",
        index: 20,
        phase: "body"
      })
    ).toMatchObject({ type: "body", selected: true });
  });

  it("keeps references and back matter out of rewriting", () => {
    expect(isReferenceEntry("张傲,刘微,刘阳,等. 基于YOLO-BioFusion的血细胞YOLOv8模型[J].电子测量技术,2025,48(18):177-188.")).toBe(
      true
    );
    expect(isReferenceEntry("Ni R,Xu S,Chen H,et al. An effective detection model based on YOLOv8 for blood cell detection[J].Frontiers in Oncology,2024,14:1369561.")).toBe(
      true
    );
    expect(
      classifyParagraph({
        text: "张傲,刘微,刘阳,等. 基于YOLO-BioFusion的血细胞YOLOv8模型[J].电子测量技术,2025,48(18):177-188.",
        index: 640,
        phase: "body"
      })
    ).toMatchObject({ type: "reference", selected: false });
    expect(classifyParagraph({ text: "致    谢", index: 657, phase: "body" })).toMatchObject({
      type: "skipped",
      selected: false
    });
    expect(
      classifyParagraph({
        text: "感谢老师的教导，言辞虽然有限，但心意却在心中传递。",
        index: 658,
        phase: "backMatter"
      })
    ).toMatchObject({ type: "skipped", selected: false });
  });

  it("skips spaced reference headings and figure/table captions", () => {
    expect(classifyParagraph({ text: "参  考  文  献", index: 641 })).toMatchObject({
      type: "reference",
      selected: false
    });
    expect(isCaptionLine("图6.1 医生检测功能界面图")).toBe(true);
    expect(isCaptionLine("表4.2 用户信息表")).toBe(true);
    expect(classifyParagraph({ text: "图6.1 医生检测功能界面图", index: 630 })).toMatchObject({
      type: "skipped",
      selected: false
    });
  });

  it("skips hyphenated figure captions from real papers", () => {
    expect(isCaptionLine("图3-1 系统整体用例图")).toBe(true);
    expect(isCaptionLine("表4-2 用户信息表")).toBe(true);
    expect(classifyParagraph({ text: "图3-1 系统整体用例图", index: 300, phase: "body" })).toMatchObject({
      type: "skipped",
      selected: false,
      skipReason: "图表题注默认跳过"
    });
  });

  it("skips code-like paragraphs from implementation chapters", () => {
    const code =
      '@RequestMapping(value = "/login")public R login(String username, String password, String captcha, HttpServletRequest request) { YonghuEntity user = yonghuService.selectOne(new EntityWrapper<YonghuEntity>().eq("yonghuzhanghao", username)); if(user == null || !user.getMima().equals(password)) { return R.error("账号或密码不正确"); } String token = tokenService.generateToken(user.getId(), username, "yonghu", "用户"); return R.ok().put("token", token).put("user", user);}';

    expect(isCodeLikeParagraph(code)).toBe(true);
    expect(classifyParagraph({ text: code, index: 420, phase: "body" })).toMatchObject({
      type: "skipped",
      selected: false,
      skipReason: "代码片段默认跳过"
    });
  });

  it("keeps contents, references and acknowledgements as separate skipped outline areas", () => {
    const parsed = parseParagraphLines([
      "摘 要",
      "本文设计了一套系统。",
      "关键词：系统；设计",
      "目 录",
      "1 绪论 1",
      "1 绪论",
      "正文第一段内容较长，应当作为正文进入待审阅列表。",
      "参考文献",
      "MDN Web Docs. The WebSocket API (WebSockets)[EB/OL]. 2025.",
      "致 谢",
      "感谢老师的教导，言辞虽然有限，但心意却在心中传递。"
    ]);

    expect(parsed[3]).toMatchObject({
      text: "目 录",
      type: "heading",
      selected: false,
      outlinePath: "目 录"
    });
    expect(parsed[4]).toMatchObject({
      text: "1 绪论 1",
      type: "skipped",
      selected: false,
      outlinePath: "目 录"
    });
    expect(parsed[7]).toMatchObject({
      text: "参考文献",
      type: "reference",
      selected: false,
      outlinePath: "参考文献"
    });
    expect(parsed[8]).toMatchObject({
      type: "reference",
      selected: false,
      outlinePath: "参考文献"
    });
    expect(parsed[9]).toMatchObject({
      text: "致 谢",
      type: "skipped",
      selected: false,
      outlinePath: "致 谢"
    });
    expect(parsed[10]).toMatchObject({
      selected: false,
      outlinePath: "致 谢"
    });
  });
});
