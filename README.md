# Bitespeed Backend Task -- Identity Reconciliation

## Overview

This project implements the Identity Reconciliation backend task.

It exposes a POST `/identify` endpoint that links customer contacts
based on email or phone number. If multiple records belong to the same
person, they are grouped under a single primary contact.

The implementation is built using:

-   Node.js
-   TypeScript
-   Express
-   SQLite

------------------------------------------------------------------------

## Setup Instructions

### 1. Clone the repository

    git clone https://github.com/Sankalp85/identity-reconciliation
    cd identity-reconciliation
    
### 2. Install dependencies

    npm install

### 3. Run the server

Development mode:

    npm run dev

Production mode:

    npm start

The server will start on:

    http://localhost:3000

------------------------------------------------------------------------

## API

### POST /identify

Request body:

    {
      "email": "string (optional)",
      "phoneNumber": "string (optional)"
    }

At least one field (email or phoneNumber) is required.

Response:

    {
      "contact": {
        "primaryContactId": number,
        "emails": string[],
        "phoneNumbers": string[],
        "secondaryContactIds": number[]
      }
    }

------------------------------------------------------------------------

## Logic Summary

-   If no existing contact matches → create a new primary contact.
-   If matching contacts exist → link them under the oldest primary.
-   If multiple primaries are discovered → merge them.
-   Contacts are connected using linkedId and linkPrecedence.
-   The oldest contact always remains the primary.

------------------------------------------------------------------------

## Testing

You can test the endpoint using Postman or curl:

    curl -X POST http://localhost:3000/identify ^
      -H "Content-Type: application/json" ^
      -d "{"email":"test@example.com","phoneNumber":"1234567890"}"

------------------------------------------------------------------------

## Notes

-   Email matching is case-insensitive.
-   Either email or phone number is enough to identify a user.
-   No records are deleted; contacts are linked instead.
