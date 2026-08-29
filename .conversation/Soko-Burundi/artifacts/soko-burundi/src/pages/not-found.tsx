import { ArrowLeft, Compass } from 'lucide-react';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="market-texture flex min-h-[70vh] w-full items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-accent text-accent-foreground"><Compass size={28} /></div>
        <p className="mt-7 text-xs font-bold uppercase tracking-[.22em] text-accent">Nzanila Express</p>
        <h1 className="display mt-3 text-5xl leading-none text-primary">Cette allée est vide.</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">La page que vous cherchez n’est pas dans notre marché pour le moment.</p>
        <Link href="/" data-testid="link-not-found-home" className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground"><ArrowLeft size={16} /> Retour à l’accueil</Link>
      </div>
    </div>
  );
}
