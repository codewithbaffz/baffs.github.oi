import * as React from 'react';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        destructive:
          'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const Alert = React.forwardRef((props, ref) => {
  const { className, variant, ...rest } = /** @type {any} */ (props);
  return <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...rest} />;
});
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef((props, ref) => {
  const { className, ...rest } = /** @type {any} */ (props);
  return (
    <h5
      ref={ref}
      className={cn('mb-1 font-medium leading-none tracking-tight', className)}
      {...rest}
    />
  );
});
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef((props, ref) => {
  const { className, ...rest } = /** @type {any} */ (props);
  return <div ref={ref} className={cn('text-sm [&_p]:leading-relaxed', className)} {...rest} />;
});
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
