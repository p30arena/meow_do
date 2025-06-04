import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { register, type LoginResponse } from '../../api/auth';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters long'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterFormInputs = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  onRegisterSuccess: (data: LoginResponse) => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onRegisterSuccess }) => {
  const { t } = useTranslation();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormInputs) => {
    setError('');
    setLoading(true);

    try {
      console.log('Attempting registration with:', { username: data.username, email: data.email, password: data.password });
      const registerData = await register(data.username, data.email, data.password);
      onRegisterSuccess(registerData);
    } catch (err: any) {
      setError(err.message || t('register.errorOccurred'));
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">{t('register.title')}</CardTitle>
        <CardDescription>{t('register.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>
        <div className="flex flex-col items-center justify-center mb-4">
          <img src="/logo.png" alt="MeowDo Logo" className="h-16 w-16 mb-2" />
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="username">{t('register.username')}</Label>
            <Input
              id="username"
              type="text"
              placeholder="john_doe"
              {...formRegister('username')}
            />
            {errors.username && <p className="text-red-500 text-sm">{errors.username.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">{t('register.email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              {...formRegister('email')}
            />
            {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">{t('register.password')}</Label>
            <Input
              id="password"
              type="password"
              {...formRegister('password')}
            />
            {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">{t('register.confirmPassword')}</Label>
            <Input
              id="confirmPassword"
              type="password"
              {...formRegister('confirmPassword')}
            />
            {errors.confirmPassword && <p className="text-red-500 text-sm">{errors.confirmPassword.message}</p>}
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('register.registering') : t('register.signUp')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default RegisterForm;
