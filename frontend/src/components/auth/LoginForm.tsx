import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { login, type LoginResponse } from "../../api/auth";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface LoginFormInputs {
  email: string;
  password: string;
}

const loginSchema = (t: any): z.ZodSchema<LoginFormInputs> =>
  z.object({
    email: z.string().email(t("validation.invalidEmail")),
    password: z.string().min(6, t("validation.passwordMinLength", { min: 6 })),
  });

interface LoginFormProps {
  onLoginSuccess: (data: LoginResponse) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const { t } = useTranslation();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema(t)),
  });

  const onSubmit = async (data: LoginFormInputs) => {
    setError("");
    setLoading(true);

    try {
      const loginData = await login(data.email, data.password);
      onLoginSuccess(loginData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("login.errorOccurred");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">{t("login.title")}</CardTitle>
        <CardDescription>{t("login.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center mb-4">
          <img src="/logo.png" alt="MeowDo Logo" className="h-16 w-16 mb-2" />
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">{t("login.email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "login-email-error" : undefined}
              {...register("email")}
            />
            {errors.email && (
              <p id="login-email-error" className="text-sm text-destructive" role="alert">{errors.email.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">{t("login.password")}</Label>
            <Input
              id="password"
              type="password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "login-password-error" : undefined}
              {...register("password")}
            />
            {errors.password && (
              <p id="login-password-error" className="text-sm text-destructive" role="alert">{errors.password.message}</p>
            )}
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("login.loggingIn") : t("login.signIn")}
          </Button>
        </form>
        <div className="flex justify-center items-center my-5 mb-4">
          <LanguageSwitcher />
        </div>
      </CardContent>
    </Card>
  );
};

export default LoginForm;
