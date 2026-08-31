import { PageSkeleton } from '@/components/States';

export default function Loading() {
  return <PageSkeleton label="Loading judicial statistics" rows={5} />;
}
