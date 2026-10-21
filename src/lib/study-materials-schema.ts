import { z } from "zod";

const entity = {
  id: z.uuid(),
  subjectId: z.uuid().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
};

export const studyMaterialsSchema = z.object({
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
  })).max(20_000),
  deletedIds: z.array(z.uuid()).max(10_000),
});
