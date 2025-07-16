import z from "zod";

export const IdentifyScheema = z.object({
    email: z.email(),
    phoneNumber: z.number()
}).strict();

export type IdentifyData = z.infer<typeof IdentifyScheema>;