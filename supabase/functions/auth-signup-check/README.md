# Auth Signup Check Hook

This Supabase auth hook controls who can sign up for Mediqom based on beta application approval status.

## How It Works

1. **Hook Trigger**: Runs before every user signup attempt
2. **Beta Mode Check**: If `BETA_ONLY_MODE=true`, validates beta approval
3. **Email Verification**: Checks if email exists in `beta_applications` with status "approved"
4. **Response**: Allows or rejects signup with appropriate error message

## Environment Variables

```env
BETA_ONLY_MODE=true  # Enable beta-only access control
SUPABASE_AUTH_HOOK_SECRET=your-secure-secret  # Auth hook security token
```

## Setup Instructions

### 1. Deploy the Function
```bash
supabase functions deploy auth-signup-check
```

### 2. Configure Auth Hook
The hook is already configured in `supabase/config.toml`:
```toml
[auth.hook.pre_signup]
enabled = true
uri = "http://127.0.0.1:54326/functions/v1/auth-signup-check"
```

For production, update the URI to your live function URL.

### 3. Set Environment Variables
Add to your `.env` file:
```env
BETA_ONLY_MODE=true
SUPABASE_AUTH_HOOK_SECRET=generate-a-secure-random-string
```

### 4. Test the Setup
1. Try signing up with an unapproved email → Should be rejected
2. Apply for beta access and get approved → Should be allowed
3. Set `BETA_ONLY_MODE=false` → Anyone should be able to sign up

## User Experience

### When Beta Mode is ON:
- **Approved users**: Normal signup flow
- **Pending applications**: "Your beta application is under review"
- **Rejected applications**: "Your beta application was not approved"
- **No application**: "Beta access required. Please apply for beta access first."

### When Beta Mode is OFF:
- **Anyone**: Can sign up normally
- **Beta system**: Still works for early access management

## Admin Control

To switch between beta-only and public access:

1. **Enable Beta Mode**: Set `BETA_ONLY_MODE=true`
2. **Disable Beta Mode**: Set `BETA_ONLY_MODE=false`
3. **Restart**: Restart your application/functions

## Security Features

- Hook secret verification prevents unauthorized access
- Rate limiting through Supabase's built-in limits
- Graceful error handling with user-friendly messages
- Fallback behavior in case of system errors

## Monitoring

Check function logs:
```bash
supabase functions logs auth-signup-check --follow
```

Look for:
- Approved beta signups
- Rejected signup attempts
- Configuration errors
- Hook authentication failures

## Troubleshooting

### Hook Not Working
- Verify `SUPABASE_AUTH_HOOK_SECRET` is set correctly
- Check function deployment status
- Confirm hook URI in auth configuration

### Users Can't Sign Up (Beta Mode ON)
- Verify user has approved beta application
- Check email matches exactly (case-sensitive)
- Confirm `beta_applications` table has correct data

### Everyone Can Sign Up (Beta Mode ON)
- Verify `BETA_ONLY_MODE=true` is set
- Check function logs for errors
- Confirm hook is being called

## Integration with Beta Flow

This hook integrates with the beta approval system:

1. User applies via `/www/en/beta` form
2. Admin approves in Supabase Dashboard
3. Database trigger creates auth user + profile
4. User receives confirmation email
5. This hook allows the signup to proceed
6. User completes account setup