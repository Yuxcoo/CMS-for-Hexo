import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/session';

export default function HomePage() {
  redirect(isAuthenticated() ? '/dashboard' : '/login');
}
