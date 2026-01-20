# Availability Engine - Dependencies

## Required Dependencies

The availability engine requires the following npm packages to be installed:

```bash
npm install date-fns date-fns-tz
```

## Why These Dependencies?

- **date-fns**: Modern JavaScript date utility library for parsing, formatting, and manipulating dates
- **date-fns-tz**: Timezone support for date-fns, critical for handling Argentina timezone correctly

## Installation Issue

If you encounter permission errors with npm, run:

```bash
sudo chown -R $(whoami) ~/.npm
npm install date-fns date-fns-tz
```

## Verification

After installation, you can verify the packages are installed:

```bash
npm list date-fns date-fns-tz
```

## Files Created

The following files have been created for the availability engine:

```
src/lib/availability/
├── index.ts                      # Public API exports
├── types.ts                      # TypeScript type definitions
├── timeUtils.ts                  # Time manipulation utilities
├── slotGeneration.ts            # Slot grid generation logic
├── collisionDetection.ts        # Collision filtering logic
└── getAvailableSlots.ts         # Main availability function

src/app/api/v1/availability/
└── route.ts                      # REST API endpoint
```

## Next Steps

Once dependencies are installed:

1. The dev server should compile without errors
2. You can test the API endpoint: `GET /api/v1/availability?date=2026-01-22&serviceId=...&professionalId=...&shopId=...`
3. Create test data in Supabase to verify functionality
