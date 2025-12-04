# SFIMS API Postman Collection

## Import Instructions

1. Open Postman
2. Click "Import" button
3. Select `SFIMS-API.postman_collection.json`
4. All API endpoints will be available

## Available Endpoints

### Projects
- GET /api/projects - Get all projects
- GET /api/projects/:id - Get project by ID
- POST /api/projects - Create project
- PUT /api/projects/:id - Update project
- DELETE /api/projects/:id - Delete project

### Employees
- GET /api/employees - Get all employees
- GET /api/employees/:id - Get employee by ID
- POST /api/employees - Create employee
- PUT /api/employees/:id - Update employee
- DELETE /api/employees/:id - Delete employee

### Assets
- GET /api/assets - Get all assets
- GET /api/assets/:id - Get asset by ID
- POST /api/assets - Create asset
- PUT /api/assets/:id - Update asset
- DELETE /api/assets/:id - Delete asset

### Assignments
- GET /api/assignments - Get all assignments
- GET /api/assignments/:id - Get assignment by ID
- POST /api/assignments - Create assignment
- PUT /api/assignments/:id - Update assignment
- DELETE /api/assignments/:id - Delete assignment

### Audit Logs
- GET /api/audit-logs - Get all audit logs
- GET /api/audit-logs/:id - Get audit log by ID

## Setup

1. Install dependencies: `npm install`
2. Configure `.env` file with your MySQL credentials
3. Run development server: `npm run dev`
4. Server runs on http://localhost:3000
