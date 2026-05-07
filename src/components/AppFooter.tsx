// Copyright © 2026. All rights reserved. Developed by: [Hani Salem Al-Johani] - Employee ID: [10594] - FYPC Industrial Security Dept.
// Subtle, professional, fixed-position footer applied to every page.
export default function AppFooter() {
  return (
    <footer className="w-full border-t border-border/40 bg-background/70 backdrop-blur-sm py-2 px-4 text-center">
      <p className="text-[11px] text-muted-foreground tracking-wide">
        Developed by: <span className="font-medium">Hani Salem Al-Johani</span> — Industrial Security Dept. © 2026
      </p>
    </footer>
  );
}
