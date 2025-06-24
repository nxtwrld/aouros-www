# Beta Access System Documentation

## Overview

The beta access system allows potential users to apply for early access to Mediqom through a public form. Applications are stored in Supabase and can be managed through the Supabase Dashboard.

## Components

### 1. Database Schema

**Table**: `beta_applications`

Key fields:
- `id` - UUID primary key
- `status` - pending, approved, rejected, converted
- `user_type` - family, provider, developer, organization
- `email` - unique email address
- `created_at`, `updated_at` - timestamps
- `profile_id` - links to user profile when account is created

The table includes RLS policies:
- Anyone can insert (public form submission)
- Only authenticated users can view/update (admin access)

### 2. API Endpoint

**Endpoint**: `/v1/beta/apply`

- **POST**: Submit new beta application
  - Validates all required fields using Zod schema
  - Checks for existing applications with same email
  - Returns success/error response

- **GET**: Check application status by email (optional)
  - Query parameter: `?email=user@example.com`
  - Returns status and creation date

### 3. Beta Form Component

**Component**: `/src/components/www/BetaForm.svelte`

Features:
- Complete form matching the beta page design
- Client-side validation
- Loading states during submission
- Success/error message display
- Automatic form reset on success
- Responsive design

### 4. Integration

The form is automatically rendered on the `/www/[lang]/beta` page when the slug matches "beta".

## Admin Workflow

1. **View Applications**
   - Log into Supabase Dashboard
   - Navigate to Table Editor > beta_applications
   - View all applications with filtering/sorting

2. **Review Applications**
   - Check application details
   - Add admin notes if needed
   - Update status field

3. **Approve/Reject**
   - Change status to "approved" or "rejected"
   - Add notes about the decision
   - Save changes

4. **Automated User Creation** (When status → "approved")
   - Database trigger automatically:
     - Creates auth user with their email
     - Creates profile entry linked to auth user
     - Supabase automatically sends confirmation email with magic link
     - Links beta application to profile

5. **User Confirms Email**
   - User receives Supabase's standard confirmation email
   - Clicks magic link to confirm account
   - Sets password on first login
   - Database trigger marks beta application as "converted"
   - User can now sign in normally

## Future Enhancements

1. **Custom Email Templates**
   - Customize Supabase auth email templates
   - Add beta-specific welcome content
   - Branded email design

2. **Enhanced Automation**
   - Auto-approve based on criteria
   - Bulk approval interface
   - Waitlist management

3. **Analytics Dashboard**
   - Application trends
   - Conversion rates
   - User type distribution
   - Geographic distribution

## Security Considerations

- Email uniqueness enforced at database level
- RLS policies prevent public access to application data
- All inputs validated server-side
- Rate limiting should be added to prevent spam

## Testing

To test the system:

1. Visit `/www/en/beta`
2. Fill out the form with test data
3. Submit and verify success message
4. Check Supabase Dashboard for new application
5. Update status and verify changes

## Maintenance

- Monitor for spam applications
- Regular review of pending applications
- Archive old/rejected applications periodically
- Update form fields as requirements change