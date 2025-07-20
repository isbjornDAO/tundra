# Development Tools

This directory contains development and testing utilities for the Tundra project.

## Files

### `test-mongo.js`
MongoDB connection test script. Tests database connectivity and basic CRUD operations.

**Usage:**
```bash
# Make sure MONGODB_URI is set in your .env file
node dev-tools/test-mongo.js
```

**Environment Variables Required:**
- `MONGODB_URI` - MongoDB connection string

### `test-admin.html`
Admin interface for testing tournament creation and management.

**Usage:**
1. Start the development server: `npm run dev`
2. Open `test-admin.html` in a browser
3. Use the interface to create and fetch tournaments

**Note:** This tool expects the API to be running on `http://localhost:3001/api`

## Security Note
These tools are for development purposes only and should not be deployed to production environments.
