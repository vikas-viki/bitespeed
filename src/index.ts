import express, { Request, Response } from 'express';
import { IdentifyScheema } from './lib/zod';
import { db } from './lib/clients';
import { LinkPrecedence } from '../prisma';
import { getMatchingContacts } from './lib/helpers';
import { ZodError } from 'zod';

const app = express();

app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
    res.json({ message: 'All Good!' });
});

app.post('/identify', async (req: Request, res: Response) => {
    try {
        const body = IdentifyScheema.parse(req.body);
        const contacts = await db.contact.findMany({
            where: {
                OR: [
                    {
                        email: body.email
                    },
                    {
                        phoneNumber: body.phoneNumber?.toString()
                    }
                ],
                linkPrecedence: LinkPrecedence.Primary
            },
            orderBy: {
                createdAt: 'asc'
            },
            select: {
                id: true,
                email: true,
                phoneNumber: true
            }
        });
        if (body.email && body.phoneNumber) {
            if (contacts.length == 0) {
                await db.contact.create({
                    data: {
                        email: body.email,
                        phoneNumber: body.phoneNumber?.toString(),
                        linkPrecedence: LinkPrecedence.Primary
                    }
                });
            } else {
                // create secondary contact only when it does not exists in database.
                const tempContact = await db.contact.findFirst({
                    where: {
                        email: body.email,
                        phoneNumber: body.phoneNumber?.toString()
                    }
                });
                if (!tempContact) {
                    await db.contact.create({
                        data: {
                            email: body.email,
                            phoneNumber: body.phoneNumber?.toString(),
                            linkPrecedence: LinkPrecedence.Secondary,
                            linkedId: contacts[0].id
                        }
                    });
                }
                const contactIds = contacts.map((c: { id: number }) => c.id);
                contactIds.shift(); // we're removing first one, cause it'll be primary
                await db.contact.updateMany({
                    where: {
                        id: {
                            in: contactIds
                        }
                    },
                    data: {
                        linkPrecedence: LinkPrecedence.Secondary,
                        linkedId: contacts[0].id
                    }
                });
            }
        }

        const contact = await getMatchingContacts(body.email, body.phoneNumber);
        res.status(200).json({ contact: contact });
    } catch (e: unknown) {
        if (e instanceof ZodError) {
            const messages = e.issues.map(e => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        const errorMessage = (typeof e === 'object' && e !== null && 'message' in e) ? (e as { message: string }).message : 'Please try again later!';
        res.status(500).json({ message: errorMessage });
    }
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});