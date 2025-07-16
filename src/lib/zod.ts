import z from 'zod';

export const IdentifyScheema = z.object({
    email: z.email().nullable(),
    phoneNumber: z.number().nullable()
}).strict();

export type IdentifyData = z.infer<typeof IdentifyScheema>;