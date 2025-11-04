# Environment Variables Setup

Create a `.env.local` file in the root of your frontend project with the following variables:

```env

# NextAuth.js (keeping for compatibility, but not used in new auth system)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key-change-in-production

# Database (if needed for any remaining NextAuth functionality)
DATABASE_URL=postgresql://$(whoami)@localhost:5432/dappdojo_dev

# JWT Configuration (if needed for any server-side JWT verification)
JWT_SECRET=your-jwt-secret-key-change-in-production

# Development flags
NODE_ENV=development
```

## Instructions

1. **Create the file**: In your frontend root directory, create a file named `.env.local`
2. **Copy the content**: Copy the environment variables above into the file
3. **Update values**: 
   - Change `your-nextauth-secret-key-change-in-production` to a secure random string
   - Change `your-jwt-secret-key-change-in-production` to a secure random string
   - Update `NEXT_PUBLIC_API_BASE_URL` if your backend runs on a different port
4. **Restart your development server** after creating the file

## Important Notes

- The `.env.local` file should be in the same directory as your `package.json`
- Never commit `.env.local` to version control (it should be in `.gitignore`)
- The `NEXT_PUBLIC_` prefix makes variables available in the browser
- Variables without this prefix are only available on the server side
