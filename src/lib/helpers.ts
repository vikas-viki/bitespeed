import { LinkPrecedence } from '../prisma';
import { ContactResponse } from '../types';
import { db } from './clients';

export const getMatchingContacts = async (email: string | null, phoneNumber: number | null) => {
    const contact: ContactResponse = { primaryContactId: 0, emails: [], phoneNumbers: [], secondaryContactIds: [] };

    const matchingContact = await db.contact.findFirst({
        where: {
            OR: [
                {
                    email: email
                },
                {
                    phoneNumber: phoneNumber?.toString()
                }
            ]
        },
        select: {
            linkedId: true,
            id: true,
            linkPrecedence: true
        }
    });
    if (!matchingContact) throw ('No Contact found!');
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

    return contact;
};