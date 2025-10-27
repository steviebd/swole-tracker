# Swole Tracker Project Details

## Overview

Swole Tracker is a modern fitness tracking application built with Next.js, React 19, TypeScript, and the T3 Stack. It provides comprehensive workout tracking, WHOOP integration, offline-first functionality, and cross-platform support with mobile PWA capabilities.

## Features

- **Workout Tracking**: Log workouts, exercises, sets, and track progress over time
- **WHOOP Integration**: Sync workout data and recovery metrics from WHOOP devices
- **Offline-First**: Full offline functionality with automatic sync when online
- **Cross-Platform**: Web application with mobile PWA capabilities
- **Real-time Sync**: Live workout session updates and conflict resolution

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Frontend**: React 19, TypeScript, Tailwind CSS v4
- **Backend**: tRPC v11, Drizzle ORM
- **Database**: Cloudflare D1
- **Authentication**: WorkOS
- **Analytics**: PostHog
- **Package Manager**: Bun
- **Deployment**: Cloudflare Workers
- **Data Fetching**: TanStack Query (formerly React Query)

## Design Principles

- Energy Through Motion: Smooth transitions and purposeful animations
- Warm Motivation Over Cold Data: Transform data into inspiring experiences
- Mobile-First, Touch-Optimized: Thumb-friendly design for gym usage
- Glass Architecture: Depth through layering and backdrop blur effects
- Accessible Energy: WCAG 2.2 AA compliance with high-energy design

## Key Components

- Material 3 theming system with tonal palettes
- Comprehensive test suite with Vitest
- Offline storage and queue management
- Real-time workout session state
- Health advice and analytics integration

## Chunking Strategy

- Introduced shared database helpers to stay under Cloudflare D1 variable limits.
- All bulk inserts/updates now use chunked batches (typically <= 90 params per statement).
- Large IN clauses go through `whereInChunks` to avoid exceeding parameter caps.
- Whoop sync, analytics, and debrief generation rely on paging data in manageable slices.
- This design trades a few extra DB round trips for guaranteed success under D1 constraints.
