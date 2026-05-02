import { redirect } from 'next/navigation';
import { getOptionalRepoContext } from '@/lib/repo-context';
import { isAuthenticated } from '@/lib/session';

export default function HomePage() {
  if (!isAuthenticated()) redirect('/login');
  redirect(getOptionalRepoContext() ? '/dashboard' : '/onboarding');
}
