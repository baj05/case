import { PageSkeleton } from '@/components/States';

export default function Loading() {
  return <PageSkeleton label="Loading the court directory" rows={6} />;
}
