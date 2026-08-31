import { PageSkeleton } from '@/components/States';

export default function Loading() {
  return <PageSkeleton label="Loading search results" rows={6} />;
}
