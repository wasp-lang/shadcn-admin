import React from 'react';
import { ResetPasswordForm } from 'wasp/client/auth';
import { Card, CardContent } from '../../components/ui/card';
import { useTheme } from '../../hooks/use-theme';

export function PasswordReset() {
  const { colors } = useTheme();

  return (
    <div className='flex items-center justify-center min-h-screen bg-primary-foreground'>
      <Card className='w-full max-w-md'>
        <CardContent className='pt-6'>
          <ResetPasswordForm 
            appearance={{
              colors,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
} 