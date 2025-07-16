import express, { Request, Response } from 'express';
import { IdentifyScheema } from './lib/zod';
import { db } from './lib/clients';
import { LinkPrecedence } from './prisma';
import { ContactResponse } from './types';

const app = express();

app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
    res.json({ message: 'All Good!' });
});

app.post('/identify', async (req: Request, res: Response) => {
    try {
        const body = IdentifyScheema.parse(req.body);
        const contact: ContactResponse = { primaryContactId: 0, emails: [], phoneNumbers: [], secondaryContactIds: [] };
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
                if (contacts.length == 1) {
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
                } else {
                    const contactIds = contacts.map(c => c.id);
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
        }

        const matchingContact = await db.contact.findFirst({
            where: {
                OR: [
                    {
                        email: body.email
                    },
                    {
                        phoneNumber: body.phoneNumber?.toString()
                    }
                ]
            },
            select: {
                linkedId: true,
                id: true,
                linkPrecedence: true
            }
        });
        if (!matchingContact) throw ("No Contact found!");
        const primary = matchingContact?.linkPrecedence == LinkPrecedence.Primary;
        const contactsData = await db.contact.findMany({
            where: {
                OR: [
                    {
                        linkedId: primary ? matchingContact.id : matchingContact?.linkedId
                    },
                    {
                        id: primary ? matchingContact.id : matchingContact.linkedId! // to get primary contact, when searched with secondary id
                    }
                ]
            },
            select: {
                email: true,
                id: true,
                phoneNumber: true,
                linkPrecedence: true
            }
        });

        contactsData.forEach(c => {
            if (c.linkPrecedence == LinkPrecedence.Primary) {
                contact.primaryContactId = c.id;
            } else {
                contact.secondaryContactIds.push(c.id);
            }

            contact.phoneNumbers.push(c.phoneNumber || '');
            contact.emails.push(c.email || '');
        });

        res.status(200).json({ contact: contact });
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'Please try again later!' });
    }
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});