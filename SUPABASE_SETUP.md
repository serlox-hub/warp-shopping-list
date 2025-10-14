# Supabase Setup Guide

This guide will help you set up Supabase authentication and database for your shopping list application.

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create an account
2. Create a new project
3. Wait for the project to be ready (this may take a few minutes)

## 2. Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **Project API Key** (anon/public key)

## 3. Configure Environment Variables

1. Update the `.env.local` file in your project root:

```env
# Replace with your actual Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## 4. Set Up Database Tables

1. In your Supabase dashboard, go to **SQL Editor**
2. Create a new query and paste the contents of `supabase-setup.sql`
3. Run the query to create the necessary tables and security policies

The setup creates:
- `shopping_lists` table: Stores shopping lists for each user
- `shopping_items` table: Stores individual items within shopping lists
- Row Level Security (RLS) policies to ensure users can only access their own data
- Indexes for better performance
- Triggers for automatic timestamp updates

## 5. Configure Google OAuth

### 5.1 Create Google OAuth Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API** (if not already enabled)
4. Go to **Credentials** → **Create Credentials** → **OAuth client ID**
5. Choose **Web application**
6. Add authorized redirect URIs:
   - `https://your-project-id.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback` (for local development)

### 5.2 Configure Supabase Auth

1. In your Supabase dashboard, go to **Authentication** → **Providers**
2. Enable **Google** provider
3. Enter your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
4. Save the configuration

### 5.3 Configure Site URL (Important!)

1. In **Authentication** → **Settings** → **Site URL**
2. Set to your production domain (e.g., `https://your-app.vercel.app`)
3. Add redirect URLs:
   - `https://your-app.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback` (for development)

## 6. Test the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open `http://localhost:3000`
3. You should see a login page
4. Try signing in with Google
5. After successful authentication, you should be redirected to the shopping list interface

## 7. Deployment Considerations

When deploying to production (Vercel, Netlify, etc.):

1. Add the environment variables to your deployment platform
2. Update the Site URL in Supabase settings to your production domain
3. Make sure your Google OAuth redirect URIs include your production domain

## Troubleshooting

### Common Issues:

1. **"Invalid redirect URL"**: Check that your redirect URLs are correctly configured in both Google Cloud Console and Supabase
2. **"Missing environment variables"**: Ensure `.env.local` is properly configured and not committed to git
3. **Database errors**: Make sure you've run the SQL setup script in Supabase
4. **RLS errors**: Verify that Row Level Security policies are properly set up

### Getting Help:

- Check the browser console for detailed error messages
- Review Supabase logs in the dashboard
- Verify that all environment variables are set correctly

## Security Notes

- Never commit `.env.local` to version control
- The anon key is safe to use in client-side code (it's designed for this)
- Row Level Security ensures users can only access their own data
- All sensitive operations are handled server-side by Supabase