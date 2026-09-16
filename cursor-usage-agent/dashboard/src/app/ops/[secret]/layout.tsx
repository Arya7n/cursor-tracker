import { notFound } from 'next/navigation';
import { isAdminSecret } from '@/lib/admin';

export default async function OpsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  if (!isAdminSecret(secret)) notFound();
  return children;
}
