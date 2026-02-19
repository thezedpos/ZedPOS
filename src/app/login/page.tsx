// src/app/login/page.tsx
import { redirect } from 'next/navigation';

export default function GhostTrapLoginPage() {
  // If the app accidentally redirects here during logout,
  // instantly bounce them to the real home page.
  redirect('/'); 
}