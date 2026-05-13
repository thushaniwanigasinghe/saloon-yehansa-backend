# Backend Utility Scripts

This directory contains utility scripts for managing the backend database and testing features.

## Available Scripts

### 1. Database Seeding
- **File:** `seed.js`
- **Description:** Populates the database with initial service data.
- **Usage:** `npm run seed`

### 2. Admin Creation
- **File:** `create-admin.js`
- **Description:** Creates a default administrator account.
- **Usage:** `npm run create-admin`

### 3. Gemini Model Listing
- **File:** `list-gemini-models.js`
- **Description:** Lists available Google Gemini models using your API key.
- **Usage:** `npm run list-gemini`

### 4. Booking Conflict Test
- **File:** `test-booking-conflict.js`
- **Description:** An automated test to verify that the system prevents overlapping appointments.
- **Usage:** `npm run test:conflict`

---
**Note:** Ensure your `.env` file is properly configured before running these scripts.
