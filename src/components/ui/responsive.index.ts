/**
 * Responsive Components & Utilities
 * 
 * Centralized exports for the responsive design system.
 * Import from this file to access all responsive utilities.
 * 
 * @example
 * ```tsx
 * import { 
 *   useResponsive, 
 *   useResponsiveTheme,
 *   ResponsiveText, 
 *   ResponsiveView,
 *   H1, H2, H3,
 *   Row, Card,
 * } from '../components/responsive';
 * 
 * const MyScreen = () => {
 *   const { spacing, fontSize, screen } = useResponsive();
 *   const theme = useResponsiveTheme();
 *   
 *   return (
 *     <ResponsiveView padding={16}>
 *       <H1>Welcome</H1>
 *       <Card>
 *         <ResponsiveText size={14}>Content</ResponsiveText>
 *       </Card>
 *     </ResponsiveView>
 *   );
 * };
 * ```
 */

// Hooks
export { 
  useResponsive, 
  default as useResponsiveDefault,
  type ScreenSize,
  type ScreenInfo,
  type ResponsiveValues,
} from '../../hooks/useResponsive';

export { 
  useResponsiveTheme,
  BASE_THEME,
} from '../../constants/theme.responsive';

// Text Components
export { 
  ResponsiveText,
  H1, H2, H3, H4, H5,
  BodyText,
  Caption,
  Label,
  type TextVariant,
} from './ResponsiveText';

// View Components
export {
  ResponsiveView,
  Row,
  Column,
  Center,
  Card,
  Spacer,
} from './ResponsiveView';

// Icon Components
export {
  ResponsiveIcon,
  MaterialIcon,
  IonIcon,
  FeatherIcon,
} from './ResponsiveIcon';

// Image Components
export {
  ResponsiveImage,
  Avatar,
} from './ResponsiveImage';
