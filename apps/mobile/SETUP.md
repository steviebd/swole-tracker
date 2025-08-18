# Mobile App Setup - tRPC Integration

This guide explains how to set up and use the tRPC integration in the mobile app.

## Prerequisites

1. **Web App Running**: Make sure your web app is running on `http://localhost:3000`
2. **Environment Variables**: Copy and configure the environment variables
3. **Shared Types**: Ensure the shared-types package is properly linked

## Setup Steps

### 1. Environment Configuration

Copy `.env.example` to `.env.local` and update the values:

```bash
cp .env.example .env.local
```

Update the following variables in `.env.local`:

```env
# Point to your web app's development server
EXPO_PUBLIC_API_URL=http://localhost:3000

# Copy these from your web app's .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Start the Development Server

```bash
bun start
```

## Usage

### Using tRPC in Components

```tsx
import { trpc } from '../lib/trpc';

export function MyComponent() {
  // Query data
  const { data: templates, isLoading } = trpc.templates.getAll.useQuery();
  
  // Mutate data
  const createTemplate = trpc.templates.create.useMutation({
    onSuccess: () => {
      // Invalidate and refetch
      trpc.templates.getAll.invalidate();
    },
  });

  // Handle loading state
  if (isLoading) return <Text>Loading...</Text>;

  return (
    <View>
      {templates?.map(template => (
        <Text key={template.id}>{template.name}</Text>
      ))}
    </View>
  );
}
```

### Available Routers

The mobile app has access to all the same tRPC routers as the web app:

- `trpc.templates.*` - Workout templates
- `trpc.workouts.*` - Workout sessions
- `trpc.exercises.*` - Exercise management
- `trpc.preferences.*` - User preferences
- `trpc.whoop.*` - WHOOP integration
- `trpc.progress.*` - Progress tracking
- `trpc.healthAdvice.*` - AI health advice
- `trpc.wellness.*` - Wellness data
- `trpc.jokes.*` - Daily jokes
- `trpc.insights.*` - Workout insights

### Offline Support

The app includes robust offline support:

- **Automatic Caching**: All successful queries are cached to AsyncStorage
- **Background Sync**: Data syncs when the app comes back online
- **Retry Logic**: Failed requests are automatically retried
- **Cache Management**: Cache is cleared on logout for security

### Authentication

Authentication is handled automatically:

- **Token Management**: Supabase session tokens are automatically included in requests
- **Auto Refresh**: Tokens are refreshed automatically
- **Logout Handling**: Cache is cleared when users log out

## Troubleshooting

### Connection Issues

1. **Check API URL**: Ensure `EXPO_PUBLIC_API_URL` points to your running web app
2. **Network Access**: Make sure your mobile device/simulator can reach localhost
3. **CORS Issues**: The web app should already be configured for mobile requests

### Cache Issues

```tsx
import { clearQueryCache, getCacheInfo } from '../lib/query-client';

// Clear all cached data
await clearQueryCache();

// Get cache information for debugging
const cacheInfo = await getCacheInfo();
console.log('Cache info:', cacheInfo);
```

### Type Issues

If you encounter TypeScript errors with tRPC types:

1. **Rebuild Dependencies**: `bun install`
2. **Check Shared Types**: Ensure `@swole-tracker/shared-types` is properly linked
3. **Restart TypeScript**: Restart your TypeScript language server

### Development Tips

1. **React Query Devtools**: Available in development mode for debugging queries
2. **Logger**: Network requests are logged in development
3. **Error Handling**: All errors are logged with detailed information

## Production Considerations

Before deploying to production:

1. **Update API URL**: Change `EXPO_PUBLIC_API_URL` to your production web app URL
2. **Remove Logs**: Disable detailed logging in production
3. **Cache Size**: Monitor AsyncStorage usage and implement cache cleanup if needed
4. **Error Reporting**: Consider adding crash reporting for production errors