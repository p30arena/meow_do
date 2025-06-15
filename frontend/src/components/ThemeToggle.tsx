import React from 'react';
import { useTheme } from 'next-themes';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Moon, Sun } from 'lucide-react'; // Assuming lucide-react is installed
import { useBaseTheme } from '../context/BaseThemeContext'; // Import useBaseTheme

const ThemeToggle: React.FC = () => {
  const { setTheme } = useTheme();
  const { baseTheme, setBaseTheme } = useBaseTheme(); // Get baseTheme and setBaseTheme

  return (
    <div className="flex items-center gap-2"> {/* Wrap in a div for two dropdowns */}
      {/* Light/Dark Mode Toggle */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle light/dark mode</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setTheme('light')}>
            Light
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('dark')}>
            Dark
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('system')}>
            System
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Base Theme Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <span>{baseTheme.charAt(0).toUpperCase() + baseTheme.slice(1).replace(/-/g, ' ')}</span> {/* Display current base theme */}
            <span className="sr-only">Select base theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setBaseTheme('default')}>
            Default (Claude)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setBaseTheme('amber-minimal')}>
            Amber Minimal
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setBaseTheme('amethyst-haze')}>
            Amethyst Haze
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setBaseTheme('bold-tech')}>
            Bold Tech
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setBaseTheme('bubble-gum')}>
            Bubble Gum
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setBaseTheme('caffeine')}>
            Caffeine
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setBaseTheme('nature')}>
            Nature
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setBaseTheme('twitter')}>
            Twitter
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setBaseTheme('vercel')}>
            Vercel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setBaseTheme('mono')}>
            Mono
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ThemeToggle;
