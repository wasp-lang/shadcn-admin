import { useEffect, useRef, useState } from 'react';
import { cn } from '../lib/cn';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';

interface Props {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export default function LongText({ children, className = '', contentClassName = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [isOverflown, setIsOverflown] = useState(false);

  useEffect(() => {
    const checkForOverflow = () => {
      if (checkOverflow(ref.current)) {
        setIsOverflown(true);
        return;
      }
      setIsOverflown(false);
    };

    // Use requestAnimationFrame to batch layout reads
    requestAnimationFrame(checkForOverflow);
  }, []);

  if (!isOverflown)
    return (
      <div ref={ref} className={cn('truncate', className)}>
        {children}
      </div>
    );

  return (
    <>
      <div className='hidden sm:block'>
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div ref={ref} className={cn('truncate', className)}>
                {children}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className={contentClassName}>{children}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className='sm:hidden'>
        <Popover>
          <PopoverTrigger asChild>
            <div ref={ref} className={cn('truncate', className)}>
              {children}
            </div>
          </PopoverTrigger>
          <PopoverContent className={cn('w-fit', contentClassName)}>
            <p>{children}</p>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
}

const checkOverflow = (textContainer: HTMLDivElement | null) => {
  if (textContainer) {
    return textContainer.offsetHeight < textContainer.scrollHeight || textContainer.offsetWidth < textContainer.scrollWidth;
  }
  return false;
};
