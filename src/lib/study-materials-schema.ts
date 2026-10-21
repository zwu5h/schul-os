import { z } from "zod";

const entity = {
  id: z.uuid(),
  subjectId: z.uuid().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
};

export const studyMaterialsSchema = z.object({
  flashcardCategories: z.array(z.string().trim().min(1).max(80)).max(1000).optional(),
  notes: z.array(z.object({
    ...entity,
    title: z.string().max(1000),
    content: z.string().max(1_000_000),
  })).max(5000),
  flashcards: z.array(z.object({
    ...entity,
    front: z.string().max(100_000),
    back: z.string().max(100_000),
    known: z.boolean(),
    category: z.string().max(80).optional(),
  })).max(20_000),
  deletedIds: z.array(z.uuid()).max(10_000),
});
