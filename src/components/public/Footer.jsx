import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const LINKS = {
  Product: [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Changelog', href: '#' },
    { label: 'Roadmap', href: '#' },
  ],
  Company: [
    { label: 'About', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Contact', href: '#' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'Cookie Policy', href: '#' },
  ],
};

export default function Footer() {
  const { theme } = useTheme();
  return (
    <footer className="bg-surface-base border-t border-surface-muted/70 pt-16 pb-10">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center mb-4">
              <img src={theme === 'dark' ? '/logo-dark.png' : '/logo-light.png'} alt="Klevr" className="h-8 w-auto" />
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed max-w-[200px]">
              The fastest point-of-sale for modern retail businesses.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([section, links]) => (
            <div key={section}>
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">{section}</h4>
              <ul className="space-y-3">
                {links.map(link => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-zinc-500 hover:text-zinc-200 transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-surface-muted/70">
          <p className="text-xs text-zinc-600">
            &copy; {new Date().getFullYear()} Klevr. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            <a href="#" className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors">Twitter</a>
            <a href="#" className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors">LinkedIn</a>
            <a href="#" className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors">GitHub</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
