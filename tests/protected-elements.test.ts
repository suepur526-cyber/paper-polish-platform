import { describe, expect, it } from "vitest";
import {
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
