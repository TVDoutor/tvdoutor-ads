# RLS Policy Fix Instructions

## Problem
The application is experiencing a Row Level Security (RLS) policy violation when trying to add screens to the inventory. The error message is:
```
new row violates row-level security policy for table "screens"
```

## Root Cause
The RLS policy for the `screens` table requires users to have admin privileges, but the current user doesn't have the correct role in the `user_roles` table.

## Solution

### Option 1: Fix via Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor

2. **Run the Fix Script**
   - Copy and paste the contents of `fix_rls_issue.sql` into the SQL Editor
   - Execute the script

3. **Verify the Fix**
   - The script will:
     - Check the current user's role
     - Ensure the user has `super_admin` role in `user_roles` table
     - Update the user's profile to have `super_admin = true`
     - Create new RLS policies that are more permissive
     - Test the admin functions

### Option 2: Create RPC Functions (Alternative)

1. **Create Admin RPC Functions**
   - Copy and paste the contents of `create_admin_rpc_functions.sql` into the SQL Editor
   - Execute the script

2. **Update Application Code**
   - The application has been updated to use the new admin functions
   - It will fallback to direct database operations if the RPC functions fail

### Option 3: Manual Role Assignment

If you prefer to manually fix the user's role:

1. **Check Current User Role**
   ```sql
   SELECT 
       p.id,
       p.full_name,
       p.super_admin,
       p.role as profile_role,
       ur.role as user_role
   FROM public.profiles p
   LEFT JOIN public.user_roles ur ON p.id = ur.user_id
   WHERE p.id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3';
   ```

2. **Assign Super Admin Role**
   ```sql
   INSERT INTO public.user_roles (user_id, role, created_at)
   VALUES ('7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3', 'super_admin', now())
   ON CONFLICT (user_id, role) DO NOTHING;
   
   UPDATE public.profiles 
   SET super_admin = true, role = 'admin'
   WHERE id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3';
   ```

## Testing the Fix

After applying the fix:

1. **Refresh the application**
2. **Try adding a new screen**
3. **Check the browser console** for any remaining errors
4. **Verify the screen appears** in the inventory list

## Files Created/Modified

- `fix_rls_issue.sql` - Comprehensive fix script
- `create_admin_rpc_functions.sql` - RPC functions for admin operations
- `src/lib/admin-operations.ts` - Frontend admin operation utilities
- `src/pages/Inventory.tsx` - Updated to use admin functions with fallback

## Troubleshooting

If the issue persists:

1. **Check User Authentication**
   - Ensure the user is properly authenticated
   - Check that the user ID matches in both `profiles` and `user_roles` tables

2. **Verify RLS Policies**
   - Check that the screens table has the correct RLS policies
   - Ensure the `is_admin()` function returns `true` for the current user

3. **Check Database Permissions**
   - Verify that the authenticated role has the necessary permissions
   - Check that the RPC functions are properly granted execute permissions

## Security Notes

- The fix maintains security by checking user roles before allowing operations
- RPC functions use `SECURITY DEFINER` to bypass RLS while still validating permissions
- The application includes fallback mechanisms for robustness
