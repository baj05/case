import { PageSkeleton } from '@/components/States';

export default function Loading() {
  return <PageSkeleton label="Loading resources" rows={6} />;
}
