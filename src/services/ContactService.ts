import { db } from "../db/database";

interface Contact {
  id: number;
  phoneNumber: string | null;
  email: string | null;
  linkedId: number | null;
  linkPrecedence: "primary" | "secondary";
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface IdentifyRequest {
  email?: string | null;
  phoneNumber?: string | null;
}

interface IdentifyResponse {
  contact: {
    primaryContactId: number;
    emails: string[];
    phoneNumbers: string[];
    secondaryContactIds: number[];
  };
}

export class ContactService {
  /**
   * Find all contacts linked to a given contact
   */
  private async findLinkedContacts(contactId: number): Promise<Contact[]> {
    // Find the primary contact at the root of the chain
    let primaryId = contactId;
    let current = await db.get(
      "SELECT * FROM Contact WHERE id = ?",
      [contactId]
    );

    while (current && current.linkedId) {
      primaryId = current.linkedId;
      current = await db.get(
        "SELECT * FROM Contact WHERE id = ?",
        [current.linkedId]
      );
    }

    // Get all contacts in the chain
    const allContacts = await db.all(
      "SELECT * FROM Contact WHERE id = ? OR linkedId = ? OR (id IN (SELECT linkedId FROM Contact WHERE linkedId = ?))",
      [primaryId, primaryId, primaryId]
    );

    return allContacts;
  }

  /**
   * Find contacts by email or phone number
   */
  private async findContactsByEmailOrPhone(
    email: string | null,
    phoneNumber: string | null
  ): Promise<Contact[]> {
    const contacts: Contact[] = [];

    if (email) {
      const emailContacts = await db.all(
        "SELECT * FROM Contact WHERE email = ? AND deletedAt IS NULL",
        [email]
      );
      contacts.push(...emailContacts);
    }

    if (phoneNumber) {
      const phoneContacts = await db.all(
        "SELECT * FROM Contact WHERE phoneNumber = ? AND deletedAt IS NULL",
        [phoneNumber]
      );
      contacts.push(...phoneContacts);
    }

    // Remove duplicates based on id
    const uniqueContacts = Array.from(
      new Map(contacts.map((c) => [c.id, c])).values()
    );
    return uniqueContacts;
  }

  /**
   * Get all contacts in a linked chain
   */
  private async getAllLinkedContacts(contactIds: number[]): Promise<Contact[]> {
    const allLinked = new Map<number, Contact>();

    for (const id of contactIds) {
      const linked = await this.findLinkedContacts(id);
      linked.forEach((c) => allLinked.set(c.id, c));
    }

    return Array.from(allLinked.values());
  }

  /**
   * Get primary contact from a list
   */
  private getPrimaryContact(contacts: Contact[]): Contact {
    const primaryContacts = contacts.filter(
      (c) => c.linkPrecedence === "primary"
    );

    if (primaryContacts.length === 0) {
      throw new Error("No primary contact found");
    }

    // Return the oldest primary contact
    return primaryContacts.reduce((oldest, current) => {
      return new Date(oldest.createdAt) < new Date(current.createdAt)
        ? oldest
        : current;
    });
  }

  /**
   * Identify or create contact based on email/phone
   */
  async identify(request: IdentifyRequest): Promise<IdentifyResponse> {
    const { email, phoneNumber } = request;

    // Find existing contacts matching email or phone
    const existingContacts = await this.findContactsByEmailOrPhone(
      email || null,
      phoneNumber || null
    );

    // If no existing contacts, create a new primary contact
    if (existingContacts.length === 0) {
      const result = await db.run(
        "INSERT INTO Contact (email, phoneNumber, linkPrecedence) VALUES (?, ?, ?)",
        [email || null, phoneNumber || null, "primary"]
      );

      const newContact = await db.get("SELECT * FROM Contact WHERE id = ?", [
        result.id,
      ]);

      return {
        contact: {
          primaryContactId: newContact.id,
          emails: newContact.email ? [newContact.email] : [],
          phoneNumbers: newContact.phoneNumber ? [newContact.phoneNumber] : [],
          secondaryContactIds: [],
        },
      };
    }

    // Get all linked contacts
    const allLinkedContacts = await this.getAllLinkedContacts(
      existingContacts.map((c) => c.id)
    );

    // Find the primary contact (oldest one)
    const primaryContact = this.getPrimaryContact(allLinkedContacts);

    // Check if we need to create a new secondary contact
    let shouldCreateSecondary = false;

    if (email && !allLinkedContacts.some((c) => c.email === email)) {
      shouldCreateSecondary = true;
    }

    if (phoneNumber && !allLinkedContacts.some((c) => c.phoneNumber === phoneNumber)) {
      shouldCreateSecondary = true;
    }

    if (shouldCreateSecondary) {
      await db.run(
        "INSERT INTO Contact (email, phoneNumber, linkedId, linkPrecedence) VALUES (?, ?, ?, ?)",
        [email || null, phoneNumber || null, primaryContact.id, "secondary"]
      );

      // Refresh linked contacts
      const refreshedContacts = await this.findLinkedContacts(primaryContact.id);
      return this.buildResponse(primaryContact, refreshedContacts);
    }

    // Return consolidated contact info
    return this.buildResponse(primaryContact, allLinkedContacts);
  }

  /**
   * Build the response from contacts
   */
  private buildResponse(
    primaryContact: Contact,
    allContacts: Contact[]
  ): IdentifyResponse {
    const emails = new Map<string, number>();
    const phoneNumbers = new Map<string, number>();

    // Add primary contact info first
    if (primaryContact.email) {
      emails.set(primaryContact.email, 0);
    }
    if (primaryContact.phoneNumber) {
      phoneNumbers.set(primaryContact.phoneNumber, 0);
    }

    let emailIndex = 1;
    let phoneIndex = 1;

    // Add secondary contact info
    for (const contact of allContacts) {
      if (contact.id === primaryContact.id) continue;

      if (contact.email && !emails.has(contact.email)) {
        emails.set(contact.email, emailIndex++);
      }
      if (contact.phoneNumber && !phoneNumbers.has(contact.phoneNumber)) {
        phoneNumbers.set(contact.phoneNumber, phoneIndex++);
      }
    }

    // Sort by insertion order (primary first)
    const emailArray = Array.from(emails.entries())
      .sort((a, b) => a[1] - b[1])
      .map((e) => e[0]);

    const phoneArray = Array.from(phoneNumbers.entries())
      .sort((a, b) => a[1] - b[1])
      .map((p) => p[0]);

    // Get secondary contact IDs
    const secondaryContactIds = allContacts
      .filter((c) => c.id !== primaryContact.id)
      .map((c) => c.id);

    return {
      contact: {
        primaryContactId: primaryContact.id,
        emails: emailArray,
        phoneNumbers: phoneArray,
        secondaryContactIds,
      },
    };
  }
}

export const contactService = new ContactService();
