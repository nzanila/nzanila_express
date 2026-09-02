import { StorefrontBuilder } from '@/components/storefront-builder';
import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';

export function StorefrontBuilderPage() {
  return (
    <div className="h-screen">
      <StorefrontBuilder />
    </div>
  );
}
