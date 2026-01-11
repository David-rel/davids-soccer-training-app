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

## Color Scheme

### Primary brand: Emerald

- `emerald-50`: Light backgrounds
- `emerald-100`: Subtle borders, light text (e.g., header subtitle)
- `emerald-200`: Borders, hover borders
- `emerald-300`: Hover border states
- `emerald-600`: Primary buttons, header gradient start
- `emerald-700`: Header gradient end, button hover states

### Text/neutral: Gray

- `gray-500`: Subtle/muted text
- `gray-600`: Body text
- `gray-700`: Body text
- `gray-800`: Text on white backgrounds
- `gray-900`: Headings, dark buttons (like "Copy" button)

### Accent

- `white`: Backgrounds, text on dark sections
- `gray-900/gray-800`: Dark buttons (Copy button uses gray-900)

### Pattern Usage

- **Header**: `from-emerald-600 to-emerald-700` gradient with white text
- **Primary CTAs**: `bg-emerald-600` with `hover:bg-emerald-700`
- **Secondary buttons**: `bg-white text-emerald-700` with `border-emerald-200`
- **Background sections**: `bg-emerald-50` or `from-emerald-50 to-white` gradients
- **Text on dark**: `text-emerald-100` or `text-emerald-50`

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
