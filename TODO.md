# SwoleTracker TODO - Technical Debt & Enhancements

> **Executive Summary**: This web application shows strong architectural foundations with Next.js 15, React 19, tRPC v11, Drizzle ORM, and offline-first design. However, critical race condition issues exist in exercise management and template creation workflows that can create duplicate entries. Mobile/offline functionality needs strengthening, and several security and architectural improvements are required.

---

## **Phase 1: Critical Race Condition Fixes** =%
*Priority: CRITICAL - Address duplicate entries and concurrent operation issues*

### **1.1 Template Creation Race Conditions**
- **Issue**: Multiple rapid clicks on "Create Template" can bypass client-side deduplication (5-second window)
- **Location**: `src/app/_components/template-form.tsx:153-225`, `src/server/api/routers/templates.ts:184-273`
- **Solution**: 
  - Add database-level unique constraint on `(user_id, name, created_at)` with 5-second window
  - Implement idempotency keys in template creation API
  - Add server-side mutex/locking for template creation per user
- **Effort**: 2-3 days
- **Priority**: Critical

### **1.2 Exercise Creation & Linking Race Conditions**
- **Issue**: Concurrent exercise creation can create duplicate master exercises with same normalized name
- **Location**: `src/server/api/routers/exercises.ts:264-340`, `src/server/api/routers/templates.ts:31-147`
- **Solution**:
  - Add database transaction isolation for `createOrGetMaster` operations
  - Implement proper handling of unique constraint violations
  - Add retry logic with exponential backoff for constraint violations
- **Effort**: 3-4 days
- **Priority**: Critical

### **1.3 Workout Session State Race Conditions**
- **Issue**: Rapid user interactions can cause duplicate sets, corrupted state in workout sessions
- **Location**: `src/hooks/useWorkoutSessionState.ts:671-845`
- **Solution**:
  - Replace `useRef` guards with proper state-based locks
  - Implement operation queuing for rapid successive actions
  - Add state reconciliation after concurrent operations
- **Effort**: 4-5 days
- **Priority**: High

### **1.4 Database Transaction Improvements**
- **Issue**: Most database operations lack proper transaction isolation
- **Solution**:
  - Wrap all multi-table operations in database transactions
  - Add proper rollback handling for failed operations
  - Implement optimistic locking where appropriate
- **Effort**: 5-6 days
- **Priority**: High

---

## **Phase 2: Mobile/Offline Enhancements** =ñ
*Priority: HIGH - Critical for primary mobile use case*

### **2.1 Service Worker Implementation**
- **Issue**: No service worker exists despite PWA requirements
- **Solution**:
  - Implement service worker for offline caching
  - Cache critical UI assets and data
  - Add network-first/cache-first strategies based on content type
- **Location**: Create `public/sw.js` and registration logic
- **Effort**: 3-4 days
- **Priority**: High

### **2.2 Offline Queue Robustness**
- **Issue**: Offline queue lacks proper error handling and retry strategies
- **Location**: `src/lib/offline-queue.ts`, `src/hooks/use-offline-save-queue.ts`
- **Solution**:
  - Add exponential backoff with jitter for failed operations
  - Implement proper conflict resolution for offline/online data mismatches
  - Add queue persistence beyond localStorage (IndexedDB)
  - Implement queue size limits and data expiration
- **Effort**: 4-5 days
- **Priority**: High

### **2.3 Connection Status & Sync Improvements**
- **Issue**: Basic sync indicator lacks detailed status and user control
- **Location**: `src/app/_components/sync-indicator.tsx`
- **Solution**:
  - Add detailed sync status (queued items, sync progress, errors)
  - Implement manual sync trigger with progress feedback
  - Add offline data size monitoring and cleanup options
  - Improve sync conflict resolution UI
- **Effort**: 2-3 days
- **Priority**: Medium

### **2.4 IndexedDB Integration**
- **Issue**: Currently only uses localStorage which has size limitations
- **Solution**:
  - Migrate offline storage to IndexedDB for larger capacity
  - Implement proper data versioning and migration
  - Add data compression for workout history
- **Effort**: 3-4 days
- **Priority**: Medium

### **2.5 Background Sync**
- **Issue**: No background synchronization when app is not active
- **Solution**:
  - Implement background sync service worker registration
  - Add periodic sync for data updates
  - Handle sync events when app becomes active
- **Effort**: 2-3 days
- **Priority**: Medium

---

## **Phase 3: Security Hardening** =
*Priority: HIGH - Essential for production deployment*

### **3.1 Input Validation & Sanitization**
- **Issue**: Inconsistent input validation across API endpoints
- **Solution**:
  - Audit all tRPC endpoints for proper Zod schema validation
  - Add input sanitization for text fields (exercise names, template names)
  - Implement rate limiting per operation type (create vs read)
- **Location**: All routers in `src/server/api/routers/`
- **Effort**: 3-4 days
- **Priority**: High

### **3.2 Database Query Security**
- **Issue**: While user_id filtering exists, needs audit for completeness
- **Solution**:
  - Audit all database queries for proper user_id filtering
  - Add automated tests to verify data isolation
  - Implement query-level security checks
- **Effort**: 2-3 days
- **Priority**: High

### **3.3 API Rate Limiting Enhancement**
- **Issue**: Rate limiting exists but needs optimization
- **Location**: `src/lib/rate-limit.ts`, `src/lib/rate-limit-middleware.ts`
- **Solution**:
  - Implement tiered rate limiting (burst vs sustained)
  - Add IP-based rate limiting in addition to user-based
  - Implement rate limit bypass for offline queue processing
- **Effort**: 2-3 days
- **Priority**: Medium

### **3.4 Environment Variable Security**
- **Issue**: Potential for sensitive data exposure
- **Location**: `src/env.js`
- **Solution**:
  - Audit environment variable exposure to client
  - Implement runtime environment variable validation
  - Add sensitive data masking in error messages
- **Effort**: 1-2 days
- **Priority**: Medium

### **3.5 CSRF & XSS Protection**
- **Issue**: Standard protections need verification
- **Solution**:
  - Verify Next.js CSRF protection is properly configured
  - Audit for XSS vulnerabilities in dynamic content
  - Implement Content Security Policy headers
- **Effort**: 2-3 days
- **Priority**: Medium

---

## **Phase 4: Architecture Improvements** <×
*Priority: MEDIUM - Long-term maintainability and performance*

### **4.1 State Management Optimization**
- **Issue**: Large workout session state management is complex
- **Location**: `src/hooks/useWorkoutSessionState.ts` (1200+ lines)
- **Solution**:
  - Break down into smaller, focused hooks
  - Implement proper state machine pattern for workout states
  - Add state persistence and recovery mechanisms
- **Effort**: 5-6 days
- **Priority**: Medium

### **4.2 Performance Optimization**
- **Issue**: Potential performance issues with large workout histories
- **Solution**:
  - Implement proper virtualization for large lists
  - Add pagination for workout history
  - Optimize React Query cache configuration
  - Implement lazy loading for heavy components
- **Effort**: 4-5 days
- **Priority**: Medium

### **4.3 Database Performance**
- **Issue**: Missing database optimizations
- **Location**: `src/server/db/schema.ts`
- **Solution**:
  - Add composite indexes for common query patterns
  - Implement database query optimization
  - Add database connection pooling optimization
  - Consider read replicas for reporting queries
- **Effort**: 3-4 days
- **Priority**: Medium

### **4.4 Error Handling & Monitoring**
- **Issue**: Inconsistent error handling across the application
- **Solution**:
  - Implement global error boundary with proper fallbacks
  - Add structured logging with proper log levels
  - Implement error reporting and monitoring integration
  - Add performance monitoring and alerting
- **Effort**: 3-4 days
- **Priority**: Medium

### **4.5 Test Coverage Improvements**
- **Issue**: High test coverage but gaps in integration testing
- **Solution**:
  - Add end-to-end tests for critical user flows
  - Implement proper race condition testing
  - Add offline/online transition testing
  - Improve test performance and reliability
- **Effort**: 4-5 days
- **Priority**: Low

---

## **Implementation Strategy**

### **Quick Wins (1-2 weeks)**
1. Fix template creation race conditions (Phase 1.1)
2. Implement basic service worker (Phase 2.1)
3. Audit input validation (Phase 3.1)

### **Medium Term (1-2 months)**
1. Complete all Phase 1 race condition fixes
2. Enhance offline queue robustness (Phase 2.2)
3. Implement security hardening (Phase 3)

### **Long Term (2-3 months)**
1. Complete mobile/offline enhancements (Phase 2)
2. Architectural improvements (Phase 4)
3. Advanced performance optimization

---

## **Technical Approaches & Solutions**

### **Race Condition Solutions**
```typescript
// Idempotency key pattern for template creation
const createTemplateWithIdempotency = async (data: TemplateInput, idempotencyKey: string) => {
  return db.transaction(async (tx) => {
    // Check for existing operation with same key
    const existing = await tx.select().from(operations)
      .where(eq(operations.idempotencyKey, idempotencyKey));
    
    if (existing.length > 0) {
      return existing[0].result;
    }
    
    // Proceed with creation...
  });
};

// Database-level locking for master exercise creation
const createOrGetMasterWithLock = async (exerciseName: string, userId: string) => {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_lock(${hash(userId + exerciseName)})`);
    try {
      // Check + create logic here
    } finally {
      await tx.execute(sql`SELECT pg_advisory_unlock(${hash(userId + exerciseName)})`);
    }
  });
};
```

### **Offline Queue Enhancement**
```typescript
// Enhanced offline queue with proper retry logic
class EnhancedOfflineQueue {
  private async processWithRetry(item: QueueItem): Promise<boolean> {
    const backoff = Math.min(1000 * Math.pow(2, item.attempts), 30000);
    const jitter = Math.random() * 1000;
    
    try {
      await this.processItem(item);
      return true;
    } catch (error) {
      if (this.isRetryableError(error) && item.attempts < MAX_RETRIES) {
        setTimeout(() => this.retry(item), backoff + jitter);
        return false;
      }
      throw error;
    }
  }
}
```

### **State Management Pattern**
```typescript
// State machine for workout session
type WorkoutState = 
  | { status: 'loading' }
  | { status: 'editing'; data: WorkoutData }
  | { status: 'saving'; data: WorkoutData }
  | { status: 'saved'; data: WorkoutData }
  | { status: 'error'; error: Error; data?: WorkoutData };

const useWorkoutStateMachine = () => {
  const [state, setState] = useState<WorkoutState>({ status: 'loading' });
  
  const actions = {
    save: () => setState(s => s.status === 'editing' ? { ...s, status: 'saving' } : s),
    saveSuccess: () => setState(s => s.status === 'saving' ? { ...s, status: 'saved' } : s),
    // ... other actions
  };
  
  return [state, actions] as const;
};
```

---

## **Dependencies & Considerations**

### **Database Migrations Required**
- Add unique constraints for race condition prevention
- Add composite indexes for performance
- Add operation tracking table for idempotency

### **Breaking Changes**
- Service worker implementation may require cache invalidation strategy
- State management refactoring may require component updates

### **Performance Impact**
- Additional database constraints may slightly impact write performance
- Enhanced offline storage will improve user experience
- Proper caching will significantly improve perceived performance

---

## **Success Metrics**

### **Phase 1 Success Criteria**
- Zero duplicate template/exercise creation in stress testing
- All database operations complete successfully under concurrent load
- State consistency maintained during rapid user interactions

### **Phase 2 Success Criteria**
- App functions offline for core workout features
- Seamless sync when returning online
- <2s perceived loading time for cached content

### **Phase 3 Success Criteria**
- Pass security audit with no critical vulnerabilities
- All user data properly isolated and protected
- Rate limiting prevents abuse without impacting legitimate usage

### **Phase 4 Success Criteria**
- Maintainable codebase with clear separation of concerns
- <1s response time for common operations
- Comprehensive test coverage for critical paths

---

*Last Updated: 2025-01-12*
*Analysis based on comprehensive codebase review of Next.js 15 + React 19 + tRPC v11 + Drizzle ORM application*