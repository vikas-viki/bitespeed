import z from 'zod';

export const IdentifyScheema = z.object({
    email: z.email({ error: 'Invalid email format!' }).nullable(),
    phoneNumber: z.number({ error: 'Please enter only numbers!' }).nullable()
}).strict();

export type IdentifyData = z.infer<typeof IdentifyScheema>;