/*
 * MOBILE TOPBAR COMPONENT
 * 
 * Topbar fixa (sticky) para navegação mobile com:
 * - Efeito blur/backdrop no fundo
 * - Logo/Nome do app centralizado
 * - Botão hambúrguer para abrir menu lateral
 * - Visível apenas em telas mobile (md:hidden)
 * - Design moderno e minimalista
 */

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileNav } from "./mobile-nav";
import frametyLogo from "@assets/Framety - PNG -  01_1759177448673.png";

export function MobileTopbar() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <>
      <header 
        className="md:hidden sticky top-0 z-30 w-full border-b border-border bg-card/80 backdrop-blur-lg supports-[backdrop-filter]:bg-card/60"
        data-testid="mobile-topbar"
      >
        <div className="flex h-16 items-center justify-between px-4">
          {/* Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileNavOpen(true)}
            className="touch-target"
            aria-label="Abrir menu de navegação"
            data-testid="mobile-menu-button"
          >
            <Menu className="h-6 w-6" />
          </Button>

          {/* Logo */}
          <div className="flex-1 flex justify-center">
            <img 
              src={frametyLogo} 
              alt="Framety" 
              className="h-12 w-auto object-contain"
            />
          </div>

          {/* Spacer for symmetry */}
          <div className="w-10" />
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <MobileNav 
        isOpen={isMobileNavOpen} 
        onClose={() => setIsMobileNavOpen(false)} 
      />
    </>
  );
}
