// components/header.tsx
import Image from "next/image";
import Link from "next/link";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logotipo */}
        <Link href="/" className="flex items-center gap-3">
          {/* Substitui pelo teu logotipo real */}
          <div className="relative w-10 h-10">
            <Image
              src="/icon-dark-32x32.png"          // coloca o teu logotipo em public/logo.png
              alt="JBricolage Horas"
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="text-xl font-bold text-primary">
            Folha de Serviços
          </span>
        </Link>

        {/* Espaço para futuro menu ou info (opcional) */}
        <div className="flex items-center gap-4">
          {/* Ex: ícone de utilizador ou data atual */}
          {/* <span className="text-sm text-muted-foreground">Joel Reis</span> */}
        </div>
      </div>
    </header>
  );
}