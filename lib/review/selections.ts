import { prisma } from "@/lib/db";
import { canSelectParagraph } from "@/lib/review/outline";

export type SelectionPatch = {
  id: string;
  selected: boolean;
};

export type SelectionRecord = {
  id: string;
  type: string;
  selected: boolean;
};

export function applySelectionRules(
  records: readonly SelectionRecord[],
  selections: readonly SelectionPatch[]
) {
  const requested = new Map(selections.map((selection) => [selection.id, selection.selected]));

  return records.map((record) => {
    if (!canSelectParagraph(record)) {
      return { id: record.id, selected: false };
    }

    return {
      id: record.id,
      selected: requested.has(record.id) ? Boolean(requested.get(record.id)) : record.selected
    };
  });
}

export async function updateTaskParagraphSelections(taskId: string, selections: SelectionPatch[]) {
  const task = await prisma.paperTask.findUnique({
    where: { id: taskId },
    include: { paragraphs: { orderBy: { index: "asc" } } }
  });

  if (!task) return null;

  const nextSelections = applySelectionRules(task.paragraphs, selections);

  await prisma.$transaction(
    nextSelections.map((selection) =>
      prisma.paragraphRecord.update({
        where: { id: selection.id },
        data: { selected: selection.selected }
      })
    )
  );

  return prisma.paperTask.findUnique({
    where: { id: taskId },
    include: { paragraphs: { orderBy: { index: "asc" } } }
  });
}
