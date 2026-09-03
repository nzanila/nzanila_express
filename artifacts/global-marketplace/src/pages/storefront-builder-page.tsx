import { StorefrontBuilder } from '@/components/storefront-builder';
import { useParams } from 'wouter';

export function StorefrontBuilderPage() {
  const params = useParams();
  const sellerId = Number(params?.id || '1');

  return (
    <div className="h-screen">
      <StorefrontBuilder sellerId={sellerId} />
    </div>
  );
}
