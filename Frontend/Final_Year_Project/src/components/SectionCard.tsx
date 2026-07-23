import { forwardRef } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
  delay?: number;
}

export const SectionCard = forwardRef<HTMLDivElement, SectionCardProps>(
  ({ title, subtitle, icon, action, className, bodyClassName, children, delay = 0 }, ref) => {
    return (
      <motion.section
        ref={ref}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay }}
        className={cn(
          'rounded-[18px] border border-border bg-card card-shadow',
          className
        )}
      >
        {(title || action) && (
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 md:px-5">
            <div className="flex items-center gap-2.5">
              {icon && <div className="text-primary">{icon}</div>}
              <div>
                {title && <h3 className="text-sm font-bold leading-tight">{title}</h3>}
                {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
              </div>
            </div>
            {action}
          </div>
        )}
        <div className={cn('p-4 md:p-5', bodyClassName)}>{children}</div>
      </motion.section>
    );
  }
);
SectionCard.displayName = 'SectionCard';
