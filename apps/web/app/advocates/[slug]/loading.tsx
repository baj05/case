import { PageSkeleton } from '@/components/States';

export default function Loading() {
  return <PageSkeleton label="Loading this profile" rows={3} />;
}
