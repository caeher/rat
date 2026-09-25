import React, { ElementRef, ComponentPropsWithoutRef, forwardRef } from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { twMerge } from 'tailwind-merge';

export const Tabs = TabsPrimitive.Root;

export const TabsList = forwardRef<
  ElementRef<typeof TabsPrimitive.List>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={twMerge(
      'inline-flex h-9 items-center justify-start rounded-[4px] bg-[var(--color-card)] p-1 text-[var(--color-driftwood)] border border-[var(--color-outline)]/60 select-none gap-1 max-w-full overflow-x-auto',
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

export const TabsTrigger = forwardRef<
  ElementRef<typeof TabsPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={twMerge(
      'inline-flex items-center justify-center whitespace-nowrap shrink-0 rounded-[3px] px-3 py-1 text-[13px] font-normal transition-all ' +
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-canvas)] ' +
        'disabled:pointer-events-none disabled:opacity-50 ' +
        'data-[state=active]:bg-[var(--color-canvas)] data-[state=active]:text-[var(--color-text)] data-[state=active]:shadow-[0_1px_2px_rgba(0,0,0,0.05)] data-[state=active]:border data-[state=active]:border-[var(--color-outline)]/60 ' +
        'hover:text-[var(--color-text)] cursor-pointer',
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export const TabsContent = forwardRef<
  ElementRef<typeof TabsPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={twMerge(
      'mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-canvas)] rounded-[4px]',
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;
