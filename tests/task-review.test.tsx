import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskReview } from "@/components/task-review";

const task = {
  id: "task-1",
  status: "awaiting_review",
  paragraphs: [
    {
      id: "heading-1",
      index: 0,
      type: "heading",
      outlinePath: "第一章 绪论",
      originalText: "第一章 绪论",
      selected: false,
      status: "skipped",
      skipReason: "标题默认跳过",
      riskLevel: "medium",
      citationCount: 0,
      numberingPrefix: null
    },
    {
      id: "chapter-summary-1",
      index: 1,
      type: "body",
      outlinePath: "论文组织结构",
      originalText: "第1章 绪论：主要介绍了本课题的研究背景与意义，分析了国内外研究现状。",
      selected: true,
      status: "selected",
      skipReason: null,
      riskLevel: "low",
      citationCount: 0,
      numberingPrefix: null
    },
    {
      id: "compact-chapter-guide-1",
      index: 2,
      type: "body",
      outlinePath: "论文组织结构",
      originalText: "第一章主要对系统研究背景和价值进行整理。",
      selected: true,
      status: "selected",
      skipReason: null,
      riskLevel: "low",
      citationCount: 0,
      numberingPrefix: null
    },
    {
      id: "body-1",
      index: 3,
      type: "body",
      outlinePath: "段落 2",
      originalText: "（1）研究背景。人工智能工具被广泛用于课堂管理[1]。",
      selected: true,
      status: "selected",
      skipReason: null,
      riskLevel: "low",
      citationCount: 1,
      numberingPrefix: "（1）"
    },
    {
      id: "numbered-title-1",
      index: 4,
      type: "body",
      outlinePath: "非功能需求",
      originalText: "（1）性能需求：系统应具有较快的响应速度。",
      selected: true,
      status: "selected",
      skipReason: null,
      riskLevel: "low",
      citationCount: 0,
      numberingPrefix: "（1）"
    },
    {
      id: "heading-2",
      index: 5,
      type: "heading",
      outlinePath: "4.2 管理员功能模块实现",
      originalText: "4.2 管理员功能模块实现",
      selected: false,
      status: "skipped",
      skipReason: "标题默认跳过",
      riskLevel: "medium",
      citationCount: 0,
      numberingPrefix: "4."
    },
    {
      id: "keywords-1",
      index: 6,
      type: "keywords",
      outlinePath: "段落 3",
      originalText: "关键词：人工智能；教学",
      selected: false,
      status: "skipped",
      skipReason: "关键词行需在摘要润色后确认更新",
      riskLevel: "medium",
      citationCount: 0,
      numberingPrefix: null
    }
  ]
};

describe("TaskReview", () => {
  it("renders outline stats and skipped reasons", () => {
    render(<TaskReview task={task} onChanged={vi.fn()} />);

    expect(screen.getByText("大纲审阅")).toBeTruthy();
    expect(screen.getAllByText("第一章 绪论").length).toBeGreaterThan(0);
    expect(screen.getByText((_, element) => element?.textContent === "已选 4 / 可选 4 · 跳过 3")).toBeTruthy();
    expect(screen.getByText("跳过：标题默认跳过")).toBeTruthy();
    expect(screen.getByText("引用 1")).toBeTruthy();
    expect(screen.getAllByText("编号保护：（1）").length).toBe(2);
    expect(screen.queryByText("编号保护：4.")).toBeNull();
    expect(screen.getByText("保护前缀：第1章 绪论：")).toBeTruthy();
    expect(screen.getByText("保护前缀：第一章")).toBeTruthy();
    expect(screen.getByText("保护前缀：（1）性能需求：")).toBeTruthy();
  });

  it("lets users toggle selectable paragraphs only", () => {
    render(<TaskReview task={task} onChanged={vi.fn()} />);

    const bodyCheckbox = screen.getByRole("checkbox", { name: /人工智能工具/ });
    fireEvent.click(bodyCheckbox);

    expect((bodyCheckbox as HTMLInputElement).checked).toBe(false);
    expect(screen.getByText((_, element) => element?.textContent === "已选 3 / 可选 4 · 跳过 3")).toBeTruthy();
    expect(screen.queryByRole("checkbox", { name: /关键词/ })).toBeNull();
  });

  it("saves selections before starting rewrite", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => task
    } as Response);
    const onChanged = vi.fn();
    render(<TaskReview task={task} onChanged={onChanged} />);

    fireEvent.click(screen.getByRole("button", { name: "确认并开始润色" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        "/api/tasks/task-1/paragraphs",
        expect.objectContaining({ method: "PATCH" })
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        "/api/tasks/task-1/rewrite",
        expect.objectContaining({ method: "POST" })
      );
      expect(onChanged).toHaveBeenCalled();
    });

    fetchMock.mockRestore();
  });
});
