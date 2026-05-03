import { describe, expect, it } from "vitest";
import {
  extractVisibleProtectedSegments,
  extractVisibleProtectedPrefixes,
  extractProtectedTerms,
  protectedTermsRetained,
  protectedTermsStayInOrder
} from "@/lib/rewrite/protected-elements";

describe("protected rewrite elements", () => {
  it("extracts chapter guide prefixes as protected structural text", () => {
    expect(
      extractProtectedTerms(
        "第1章 绪论：主要介绍了本课题的研究背景与意义，分析了国内外研究现状。"
      )
    ).toContain("第1章 绪论：");
    expect(
      extractProtectedTerms(
        "第6章 系统测试：介绍了系统测试的环境和方法，编写了详细的测试用例。"
      )
    ).toContain("第6章 系统测试：");
  });

  it("extracts numeric and chinese outline prefixes", () => {
    expect(extractProtectedTerms("3.2.1 功能需求分析：本文说明系统功能。")).toContain("3.2.1 功能需求分析：");
    expect(extractProtectedTerms("第一节 研究背景：本文说明研究背景。")).toContain("第一节 研究背景：");
  });

  it("extracts compact chapter guide prefixes without colons", () => {
    const examples = [
      ["第一章主要对系统研究背景和价值进行整理。", "第一章"],
      ["第二章梳理本系统研发涉及的关键技术与方法。", "第二章"],
      ["第七章归纳全文研究成果，同时指出后续方向。", "第七章"]
    ];

    for (const [text, prefix] of examples) {
      expect(extractProtectedTerms(text)).toContain(prefix);
      expect(extractVisibleProtectedPrefixes(text)).toContain(prefix);
    }
  });

  it("extracts numbered item title prefixes as one protected unit", () => {
    const examples = [
      ["（1）性能需求：系统应具有较快的响应速度。", "（1）性能需求："],
      ["（2）安全需求：系统需对用户密码进行加密存储。", "（2）安全需求："],
      ["3）兼容性需求：系统前端页面应兼容主流浏览器。", "3）兼容性需求："],
      ["4. 可维护性需求：系统代码结构应清晰规范。", "4. 可维护性需求："]
    ];

    for (const [text, prefix] of examples) {
      expect(extractProtectedTerms(text)).toContain(prefix);
      expect(extractVisibleProtectedPrefixes(text)).toContain(prefix);
    }
  });

  it("extracts likely missing-colon numbered item titles", () => {
    const examples = [
      ["（2）客户端使用Windows系统，分辨率达到或超过1366×768。", "（2）客户端"],
      ["（5）数据库采用MySQL 8.0以上版本。", "（5）数据库"]
    ];

    for (const [text, prefix] of examples) {
      expect(extractProtectedTerms(text)).toContain(prefix);
      expect(extractVisibleProtectedPrefixes(text)).toContain(prefix);
      expect(extractVisibleProtectedSegments(text)).toContainEqual({
        text: prefix,
        kind: "suspectedMissingColon"
      });
    }
  });

  it("rejects rewritten text that removes protected structure", () => {
    const terms = extractProtectedTerms("第3章 系统需求分析：从可行性分析入手，梳理系统需求。");

    expect(
      protectedTermsRetained(terms, "系统需求部分从可行性分析入手，梳理系统需求。")
    ).toBe(false);
    expect(
      protectedTermsRetained(terms, "第3章 系统需求分析：从技术、经济和操作角度梳理系统需求。")
    ).toBe(true);
  });

  it("requires protected terms to stay in the original order", () => {
    const terms = extractProtectedTerms("第4章 系统设计：重点介绍 MySQL 数据库设计，并保留引用[1]。");

    expect(
      protectedTermsStayInOrder(terms, "MySQL 数据库设计见[1]，第4章 系统设计：重点介绍相关内容。")
    ).toBe(false);
    expect(
      protectedTermsStayInOrder(terms, "第4章 系统设计：重点介绍 MySQL 数据库设计，并保留引用[1]。")
    ).toBe(true);
  });
});
