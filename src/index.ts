import express, { Request, Response } from "express";
import { IdentifyScheema } from "./lib/zod";
import { db } from "./lib/clients";
import { LinkPrecedence } from "./prisma";
import { ContactResponse } from "./types";

const app = express();

app.use(express.json());

app.get("/health", (req: Request, res: Response) => {
    res.json({ message: "All Good!" });
});

app.post("/identify", async (req: Request, res: Response) => {
    try {
        const body = IdentifyScheema.parse(req.body);
        let contact: ContactResponse = { primaryContatctId: 0, emails: [], phoneNumbers: [], secondaryContactIds: [] };
        const contacts = await db.contact.findMany({
            where: {
                OR: [
                    {
                        email: body.email
                    },
                    {
                        phoneNumber: body.phoneNumber.toString()
                    }
                ],
                linkPrecedence: LinkPrecedence.Primary
            },
            orderBy: {
                createdAt: 'asc'
            },
            select: {
                id: true
            }
        });

        if (contacts.length == 0) {
            await db.contact.create({
                data: {
                    email: body.email,
                    phoneNumber: body.phoneNumber.toString(),
                    linkPrecedence: LinkPrecedence.Primary
                }
            });
        } else {
            if (contacts.length == 1) {
                await db.contact.create({
                    data: {
                        email: body.email,
                        phoneNumber: body.phoneNumber.toString(),
                        linkPrecedence: LinkPrecedence.Secondary,
                        linkedId: contacts[0].id
                    }
                });
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

        const contactsData = await db.contact.findMany({
            where: {
                OR: [
                    {
                        email: body.email
                    },
                    {
                        phoneNumber: body.phoneNumber.toString()
                    }
                ]
            }
        });

        contactsData.forEach(c => {
            if (c.linkPrecedence == LinkPrecedence.Primary) {
                contact.primaryContatctId = c.id;
            } else {
                contact.secondaryContactIds.push(c.id);
            }

            contact.phoneNumbers.push(c.phoneNumber || "");
            contact.emails.push(c.email || "");
        })

        res.status(200).json({ contact: JSON.stringify(contact) });
    } catch {
        res.status(500).json({ message: "Please try again later!" });
    }
})