This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Database Setup & Bootstrap Intent

Please note the following important guidelines regarding database setup and seed data in this repository:

- **Local Setup Only:** The seed data (`prisma/seed.ts`) exists **strictly for reproducible local setup**.
- **Setup Baseline:** The combination of `prisma/schema.prisma` + `prisma/seed.ts` + `.env.example` represents the true reproducible setup baseline.
- **Not a Source of Truth:** Seeded records are **not** the business workflow source of truth. They provide basic, neutral catalog structures to allow the application to run.
- **Real App Flow:** Implementation and feature development should always follow the actual, verified app flow. Do not use invented, hardcoded demo business records (like fake quotations or orders) to guide implementation logic.
- **Do not rely on local state:** Do not depend on a manually modified local `prisma/dev.db` database snapshot, and do not stage or rely on local `dev.db` content as a reference implementation baseline.

**Reproducible Local Setup Steps:**
1. Copy `.env.example` to `.env`
2. `npm install`
3. `npx prisma db push --accept-data-loss`
4. `npm run seed`
5. `npm run dev`
