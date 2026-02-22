# Project: Moto Manager

## General Instructions

- When you generate new TypeScript code, follow the existing coding style.
- Ensure all new functions and classes have JSDoc comments.
- Prefer functional programming paradigms where appropriate.
- Optimize the pages for fast loading times and responsiveness.

## Coding Style

- Use 2 spaces for indentation.

## File Structure

- Place tests in the /tests directory, mirroring the source file structure.
- Place playwrite tests in the /tests/e2e directory.

## Tools and Libraries

- Use tailwindcss for styling.
- Use pnpm for package management.
- Use drizzle-orm for database interactions.
- Use oxlint for linting.
- Use React Compiler for automatic memoization.

## App Structure & Pages

The application is built with React Router 7 and follows a modular route structure:

### Authentication

- **Login/Register (`/auth/login`)**: Entry point for user authentication. Supports first-user registration for admin accounts.

### Main Views

- **Garage/Home (`/`)**: Dashboard displaying all motorcycles in the user's garage with summary statistics and sorting options.
- **Documents (`/documents`)**: Global document management view where users can upload and manage PDF/image files, either privately or publicly.

### Motorcycle Details

- **Overview (`/motorcycle/:slug/:id`)**: Detailed view of a specific motorcycle, including technical data, ownership history, and a list of maintenance records.
- **Service Documents (`/motorcycle/:slug/:id/documents`)**: View and manage documents specifically assigned to a motorcycle.
- **Torque Specs (`/motorcycle/:slug/:id/torque-specs`)**: Reference table for torque specifications, with support for importing values from other motorcycles.

### Settings & Admin

- **User Settings (`/settings`)**: Personal account management, including password changes and storage location configuration.
- **Admin Area (`/settings/admin`)**: System-wide management for administrators, including user roles, currency conversion rates, and maintenance tasks like preview regeneration.
- **Server Stats (`/settings/server-stats`)**: Global instance statistics providing insights into the total number of users, motorcycles, and records.
