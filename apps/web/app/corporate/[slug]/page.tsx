import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { databaseReady, getResourceDetail, getFlags } from '@/lib/data';
import { Notice } from '@/components/States';
import { DocumentBuilder } from '@/components/DocumentBuilder';
import { CORPORATE_SUITE_SLUGS } from '@lexhall/core';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (!databaseReady() || !CORPORATE_SUITE_SLUGS.includes(slug)) return { title: 'Corporate Suite' };
  const resource = getResourceDetail(slug);
  if (!resource) return { title: 'Corporate Suite' };
  return {
    title: `${resource.title} — fill and download | Corporate Suite`,
    description: resource.description.slice(0, 300),
    alternates: { canonical: `/corporate/${resource.slug}` },
    robots: { index: false, follow: true },
  };
}

export default async function CorporateDocumentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!CORPORATE_SUITE_SLUGS.includes(slug)) notFound();
  if (!databaseReady()) {
    return <div className="container section"><Notice tone="warn">Run <code className="mono">npm run ingest</code> first.</Notice></div>;
  }
  const flags = getFlags();
  if (!flags.FEATURE_CORPORATE) notFound();

  const resource = getResourceDetail(slug);
  if (!resource || !resource.template) notFound();

  return (
    <div className="container section stack gap-6">
      <div className="stack gap-2">
        <Link href="/corporate" className="t-body-sm">← Corporate Suite</Link>
        <h1 className="t-headline-lg">{resource.title}</h1>
        <p className="t-body ink-variant" style={{ maxWidth: '70ch' }}>{resource.description}</p>
      </div>

      {resource.template.beforeYouUse.length > 0 && (
        <div className="notice notice-info">
          <span className="notice-icon" aria-hidden="true">ⓘ</span>
          <div className="stack gap-1">
            <strong>Before you use this</strong>
            <ul className="stack gap-1" style={{ paddingLeft: 18 }}>
              {resource.template.beforeYouUse.map((item) => <li key={item} className="t-body-sm">{item}</li>)}
            </ul>
          </div>
        </div>
      )}

      <DocumentBuilder
        slug={resource.slug}
        title={resource.title}
        fields={resource.template.fields}
        body={resource.template.body}
        aiExtractEnabled={Boolean(flags.FEATURE_AI_FIELD_EXTRACT)}
      />
    </div>
  );
}
