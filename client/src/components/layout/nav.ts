import { ArrowLeftRight, Compass, LayoutDashboard, Presentation, ShieldCheck, Sparkles, UserRound, Video, type LucideIcon } from 'lucide-react';
import type { CurrentUser } from '../../types';

export interface NavItem {
  to: string;
  label: string;
  /** Shorter label for the mobile bottom bar. */
  short: string;
  icon: LucideIcon;
  /** Whether this user sees the item at all. */
  visible: (user: CurrentUser) => boolean;
  /** Whether it fits in the five-slot mobile bottom bar (the rest move into the account menu). */
  mobile: (user: CurrentUser) => boolean;
}

const always = () => true;
const instructorMode = (user: CurrentUser) => user.mode === 'instructor';

// Every entry here has a real page behind it, and what shows depends on who is looking.
export const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', short: 'Home', icon: LayoutDashboard, visible: always, mobile: always },
  { to: '/teaching', label: 'Teaching', short: 'Teaching', icon: Presentation, visible: instructorMode, mobile: instructorMode },
  { to: '/discover', label: 'Discover', short: 'Discover', icon: Compass, visible: always, mobile: (u) => !instructorMode(u) },
  { to: '/classes', label: 'Classes', short: 'Classes', icon: Video, visible: always, mobile: always },
  { to: '/skills', label: 'My Skills', short: 'Skills', icon: Sparkles, visible: always, mobile: () => false },
  { to: '/requests', label: 'My Requests', short: 'Requests', icon: ArrowLeftRight, visible: always, mobile: always },
  { to: '/profile', label: 'My Profile', short: 'Profile', icon: UserRound, visible: always, mobile: always },
  { to: '/admin', label: 'Admin', short: 'Admin', icon: ShieldCheck, visible: (u) => u.role === 'admin', mobile: () => false },
];

export const navFor = (user: CurrentUser) => navItems.filter((item) => item.visible(user));
export const mobileNavFor = (user: CurrentUser) => navFor(user).filter((item) => item.mobile(user));
/** Items that don't fit the mobile bottom bar. */
export const overflowNavFor = (user: CurrentUser) => navFor(user).filter((item) => !item.mobile(user));

export function titleFor(pathname: string): string {
  if (pathname.startsWith('/students/')) return 'Student profile';
  if (pathname.startsWith('/instructor')) return 'Become an instructor';
  return navItems.find((item) => pathname.startsWith(item.to))?.label ?? 'Skill Swap';
}

/** The student profile page is reached from Discover, so keep Discover highlighted there. */
export function isActive(item: NavItem, pathname: string): boolean {
  return pathname.startsWith(item.to) || (item.to === '/discover' && pathname.startsWith('/students/')) || (item.to === '/profile' && pathname.startsWith('/instructor'));
}
