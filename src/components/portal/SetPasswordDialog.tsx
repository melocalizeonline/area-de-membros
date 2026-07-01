import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { isSamePasswordAsCurrentError } from "@/lib/supabaseAuthErrors";
import { translateAppError } from "@/lib/app-error-utils";
import { Loader2 } from "lucide-react";

// Não reabrir o onboarding na mesma sessão depois que o cliente pular.
const SKIP_KEY = "nory_onboarding_skipped";

/**
 * Dialog exibido para o customer definir um acesso permanente (senha ou Google).
 *
 * Dois gatilhos:
 * 1. `type=invite`/`type=recovery` no hash (fluxo de convite/recuperação) →
 *    obrigatório (não dá para pular).
 * 2. `customerNeedsOnboarding` — cliente que entrou por magic link e ainda não
 *    tem senha nem identidade Google. Assim, no próximo acesso ele usa
 *    e-mail+senha (ou Google) em vez de pedir link por e-mail toda vez.
 */
export function SetPasswordDialog({
  customerNeedsOnboarding = false,
}: {
  customerNeedsOnboarding?: boolean;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [forced, setForced] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // O Supabase client JS detecta o hash automaticamente e cria a sessão.
    // Verificamos type=invite/type=recovery para mostrar (obrigatório).
    const hash = window.location.hash;
    if (hash && (hash.includes("type=invite") || hash.includes("type=recovery"))) {
      setForced(true);
      setOpen(true);
      // Limpa o hash da URL para não ficar visível
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search
      );
      return;
    }
    // Cliente sem senha/Google que entrou por magic link → onboarding (pulável).
    if (customerNeedsOnboarding && sessionStorage.getItem(SKIP_KEY) !== "1") {
      setOpen(true);
    }
  }, [customerNeedsOnboarding]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError(t("portal.setPassword.minLength", "A senha deve ter pelo menos 6 caracteres."));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("portal.setPassword.passwordMismatch"));
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: { password_set: true },
      });

      if (updateError && !isSamePasswordAsCurrentError(updateError)) {
        setError(updateError.message);
        return;
      }

      toast({
        variant: "success",
        title: t("portal.setPassword.success"),
      });
      setOpen(false);
    } catch (error: unknown) {
      setError(translateAppError(error, t("portal.setPassword.error")));
    } finally {
      setSaving(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      const redirectTo = window.location.origin + window.location.pathname;
      // Vincula o Google à conta atual (o cliente já está logado pelo magic link).
      // Se o "manual linking" estiver indisponível, cai no OAuth normal — como o
      // e-mail do Google é o mesmo da compra, o Supabase reconhece a conta.
      const { error: linkErr } = await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo },
      });
      if (linkErr) {
        const { error: oauthErr } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo },
        });
        if (oauthErr) throw oauthErr;
      }
      // Em ambos os casos há redirect do navegador para o Google.
    } catch {
      setGoogleLoading(false);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("portal.setPassword.googleError"),
      });
    }
  };

  const handleSkip = () => {
    sessionStorage.setItem(SKIP_KEY, "1");
    setOpen(false);
  };

  const handleOpenChange = (next: boolean) => {
    // Sem gatilho obrigatório, fechar = pular (persiste na sessão).
    if (!next && !forced) {
      handleSkip();
      return;
    }
    setOpen(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!forced}>
        <DialogHeader>
          <DialogTitle>
            {forced ? t("portal.setPassword.title") : t("portal.setPassword.onboardingTitle")}
          </DialogTitle>
          <DialogDescription>
            {forced
              ? t("portal.setPassword.description")
              : t("portal.setPassword.onboardingDescription")}
          </DialogDescription>
        </DialogHeader>

        {!forced && (
          <>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={handleGoogle}
              disabled={googleLoading || saving}
            >
              {googleLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <svg className="size-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              {t("portal.setPassword.googleButton")}
            </Button>

            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">
                {t("portal.setPassword.orDivider")}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-password">
              {t("portal.setPassword.newPassword")}
            </Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoFocus
              minLength={6}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-password">
              {t("portal.setPassword.confirmPassword")}
            </Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" disabled={saving || googleLoading} className="w-full">
            {saving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {t("portal.setPassword.submitting")}
              </>
            ) : (
              t("portal.setPassword.submit")
            )}
          </Button>

          {!forced && (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={handleSkip}
              disabled={saving || googleLoading}
            >
              {t("portal.setPassword.skip")}
            </Button>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
