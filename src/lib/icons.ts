/**
 * Icon utilities to handle Lucide React imports properly in Next.js
 * This prevents the "Cannot read properties of undefined (reading 'call')" error
 */

// Dynamic imports for icons to avoid SSR issues
import dynamic from 'next/dynamic';

// Common icons used throughout the app
export const Heart = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Heart })), { ssr: false });
export const Mail = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Mail })), { ssr: false });
export const Lock = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Lock })), { ssr: false });
export const User = dynamic(() => import('lucide-react').then(mod => ({ default: mod.User })), { ssr: false });
export const Send = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Send })), { ssr: false });
export const Smile = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Smile })), { ssr: false });
export const Paperclip = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Paperclip })), { ssr: false });
export const Settings = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Settings })), { ssr: false });
export const LogOut = dynamic(() => import('lucide-react').then(mod => ({ default: mod.LogOut })), { ssr: false });
export const Menu = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Menu })), { ssr: false });
export const X = dynamic(() => import('lucide-react').then(mod => ({ default: mod.X })), { ssr: false });
export const Upload = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Upload })), { ssr: false });
export const Download = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Download })), { ssr: false });
export const Search = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Search })), { ssr: false });
export const Filter = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Filter })), { ssr: false });
export const Calendar = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Calendar })), { ssr: false });
export const Clock = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Clock })), { ssr: false });
export const MessageSquare = dynamic(() => import('lucide-react').then(mod => ({ default: mod.MessageSquare })), { ssr: false });
export const BarChart = dynamic(() => import('lucide-react').then(mod => ({ default: mod.BarChart })), { ssr: false });
export const PieChart = dynamic(() => import('lucide-react').then(mod => ({ default: mod.PieChart })), { ssr: false });
export const TrendingUp = dynamic(() => import('lucide-react').then(mod => ({ default: mod.TrendingUp })), { ssr: false });
export const Eye = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Eye })), { ssr: false });
export const EyeOff = dynamic(() => import('lucide-react').then(mod => ({ default: mod.EyeOff })), { ssr: false });
export const ChevronDown = dynamic(() => import('lucide-react').then(mod => ({ default: mod.ChevronDown })), { ssr: false });
export const ChevronUp = dynamic(() => import('lucide-react').then(mod => ({ default: mod.ChevronUp })), { ssr: false });
export const ChevronLeft = dynamic(() => import('lucide-react').then(mod => ({ default: mod.ChevronLeft })), { ssr: false });
export const ChevronRight = dynamic(() => import('lucide-react').then(mod => ({ default: mod.ChevronRight })), { ssr: false });
export const Plus = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Plus })), { ssr: false });
export const Minus = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Minus })), { ssr: false });
export const Check = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Check })), { ssr: false });
export const AlertTriangle = dynamic(() => import('lucide-react').then(mod => ({ default: mod.AlertTriangle })), { ssr: false });
export const Info = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Info })), { ssr: false });
export const Star = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Star })), { ssr: false });
export const Moon = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Moon })), { ssr: false });
export const Sun = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Sun })), { ssr: false });
export const Palette = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Palette })), { ssr: false });
export const Volume2 = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Volume2 })), { ssr: false });
export const VolumeX = dynamic(() => import('lucide-react').then(mod => ({ default: mod.VolumeX })), { ssr: false });
export const Wifi = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Wifi })), { ssr: false });
export const WifiOff = dynamic(() => import('lucide-react').then(mod => ({ default: mod.WifiOff })), { ssr: false });
export const RefreshCw = dynamic(() => import('lucide-react').then(mod => ({ default: mod.RefreshCw })), { ssr: false });
export const MoreVertical = dynamic(() => import('lucide-react').then(mod => ({ default: mod.MoreVertical })), { ssr: false });
export const Copy = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Copy })), { ssr: false });
export const Share = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Share })), { ssr: false });
export const ArrowLeft = dynamic(() => import('lucide-react').then(mod => ({ default: mod.ArrowLeft })), { ssr: false });
export const ArrowRight = dynamic(() => import('lucide-react').then(mod => ({ default: mod.ArrowRight })), { ssr: false });
export const ArrowUp = dynamic(() => import('lucide-react').then(mod => ({ default: mod.ArrowUp })), { ssr: false });
export const ArrowDown = dynamic(() => import('lucide-react').then(mod => ({ default: mod.ArrowDown })), { ssr: false });