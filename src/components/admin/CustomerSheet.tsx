import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";
import { useTenantCatalog } from "@/hooks/useTenantCatalog";
import { InlineCheckboxList } from "@/components/admin/InlineCheckboxList";
import { enrollCustomer } from "@/lib/enroll";
import { invokeEdgeFunction } from "@/lib/edge-function-utils";
import { CustomerAccessSection } from "@/components/admin/CustomerAccessSection";
import { translateAppError } from "@/lib/app-error-utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, Copy, Loader2 } from "lucide-react";
import type { Customer, AddCustomerData, UpdateCustomerData } from "@/hooks/useCustomers";
import { FRONTEND_NAME_MAX_LENGTH, limitNameLength } from "@/lib/name-limits";
import {
  ALLOWED_DOCUMENT_TYPES,
  splitFullName,
  buildFullName,
} from "@/lib/customer-helpers";

interface CustomerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null; // null = create mode
  onAdd: (data: AddCustomerData) => Promise<unknown>;
  onUpdate: (userId: string, data: UpdateCustomerData) => Promise<void>;
}

function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex w-full items-center justify-between py-3.5 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        {title}
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && <div className="pb-4 space-y-4">{children}</div>}
    </div>
  );
}

export default function CustomerSheet({
  open,
  onOpenChange,
  customer,
  onAdd,
  onUpdate,
}: CustomerSheetProps) {
  const { t } = useTranslation();
  const isEdit = !!customer;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [document, setDocument] = useState("");
  const [saving, setSaving] = useState(false);

  // Matrícula manual (apenas no modo criação, se o tenant permitir)
  const { tenant } = useTenant();
  const allowManualEnrollment = !!tenant?.allow_manual_enrollment;
  const { data: catalog } = useTenantCatalog();
  const [enrollProducts, setEnrollProducts] = useState<string[]>([]);
  const [enrollCourses, setEnrollCourses] = useState<string[]>([]);
  const [resettingPw, setResettingPw] = useState(false);

  const handleResetPassword = async () => {
    if (!customer) return;
    setResettingPw(true);
    try {
      await invokeEdgeFunction("customer-password-reset", {
        body: { customer_id: customer.id, origin: window.location.origin },
      });
      toast.success("E-mail de redefinição de senha enviado ao cliente.");
    } catch (err) {
      toast.error(translateAppError(err, "Não foi possível enviar agora."));
    } finally {
      setResettingPw(false);
    }
  };

  // Populate form when customer changes
  useEffect(() => {
    if (customer) {
      const parsedName = splitFullName(customer.name);
      setFirstName(limitNameLength(customer.first_name || parsedName.firstName));
      setLastName(limitNameLength(customer.last_name || parsedName.lastName));
      setEmail(customer.email || "");
      setPhone(customer.phone || "");
      setCity(customer.city || "");
      setRegion(customer.region || "");
      setCountry(customer.country || "");
      setDocumentType((customer.document_type || "").toUpperCase());
      setDocument(customer.document || "");
    } else {
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setCity("");
      setRegion("");
      setCountry("");
      setDocumentType("");
      setDocument("");
    }
  }, [customer, open]);

  const handleSave = async () => {
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    const fullName = limitNameLength(
      buildFullName(normalizedFirstName, normalizedLastName)
    );
    const normalizedPhone = phone.trim();
    const normalizedCity = city.trim();
    const normalizedRegion = region.trim();
    const normalizedCountry = country.trim();
    const normalizedDocumentType = documentType.trim().toUpperCase();
    const normalizedDocument = document.trim();

    if (!fullName) {
      toast.error(t("customerSheet.nameRequired"));
      return;
    }

    if (!isEdit && !email.trim()) {
      toast.error(t("customerSheet.emailRequired"));
      return;
    }

    if (!isEdit && !email.includes("@")) {
      toast.error(t("customerSheet.emailInvalid"));
      return;
    }


    setSaving(true);
    try {
      if (isEdit) {
        await onUpdate(customer.user_id, {
          name: fullName,
          first_name: normalizedFirstName || undefined,
          last_name: normalizedLastName || undefined,
          phone: normalizedPhone || undefined,
          city: normalizedCity || undefined,
          region: normalizedRegion || undefined,
          country: normalizedCountry || undefined,
          document_type: normalizedDocumentType || undefined,
          document: normalizedDocument || undefined,
        });
        toast.success(t("customerSheet.customerUpdated"));
      } else {
        await onAdd({
          email: email.trim().toLowerCase(),
          name: fullName,
          first_name: normalizedFirstName || undefined,
          last_name: normalizedLastName || undefined,
          phone: normalizedPhone || undefined,
          city: normalizedCity || undefined,
          region: normalizedRegion || undefined,
          country: normalizedCountry || undefined,
          document_type: normalizedDocumentType || undefined,
          document: normalizedDocument || undefined,
        });

        // Concede acesso manual aos produtos/cursos selecionados (sem checkout)
        if (allowManualEnrollment && tenant?.id && (enrollProducts.length > 0 || enrollCourses.length > 0)) {
          try {
            await enrollCustomer({
              tenantId: tenant.id,
              email: email.trim().toLowerCase(),
              productIds: enrollProducts,
              courseIds: enrollCourses,
              action: "grant",
            });
          } catch (err) {
            toast.error(
              "Cliente criado, mas falhou ao conceder acesso: " +
                (err instanceof Error ? err.message : ""),
            );
          }
        }

        toast.success(t("customerSheet.customerAdded"));
      }
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(translateAppError(error, t("customerSheet.saveError")));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col !max-w-[540px] !bg-card !border-l-0">
        <SheetHeader>
          <SheetTitle>
            {isEdit ? t("customerSheet.editTitle") : t("customerSheet.addTitle")}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 py-2 overflow-y-auto px-1">
          <Section title={t("customerSheet.sectionContact")}>
            {isEdit && customer?.public_id && (
              <div className="space-y-2">
                <Label htmlFor="customer-public-id">
                  {t("common.id", { defaultValue: "ID" })}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="customer-public-id"
                    value={customer.public_id}
                    variant="readOnly"
                    readOnly
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(customer.public_id);
                      toast.success(t("common.idCopied"));
                    }}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer-first-name">{t("customerSheet.firstNameLabel")}</Label>
                <Input
                  id="customer-first-name"
                  placeholder={t("customerSheet.firstNamePlaceholder")}
                  value={firstName}
                  onChange={(e) => setFirstName(limitNameLength(e.target.value))}
                  maxLength={FRONTEND_NAME_MAX_LENGTH}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer-last-name">{t("customerSheet.lastNameLabel")}</Label>
                <Input
                  id="customer-last-name"
                  placeholder={t("customerSheet.lastNamePlaceholder")}
                  value={lastName}
                  onChange={(e) => setLastName(limitNameLength(e.target.value))}
                  maxLength={FRONTEND_NAME_MAX_LENGTH}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-email">{t("customerSheet.emailLabel")}</Label>
              <Input
                id="customer-email"
                type="email"
                placeholder={t("customerSheet.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                variant={isEdit ? "readOnly" : "default"}
                disabled={isEdit}
                readOnly={isEdit}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-phone">{t("customerSheet.phoneLabel")}</Label>
              <Input
                id="customer-phone"
                placeholder={t("customerSheet.phonePlaceholder")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </Section>

          <Section title={t("customerSheet.sectionAddress")} defaultOpen={false}>
            <div className="space-y-2">
              <Label htmlFor="customer-city">{t("customerSheet.cityLabel")}</Label>
              <Input
                id="customer-city"
                placeholder={t("customerSheet.cityPlaceholder")}
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer-region">{t("customerSheet.regionLabel")}</Label>
                <Input
                  id="customer-region"
                  placeholder={t("customerSheet.regionPlaceholder")}
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer-country">{t("customerSheet.countryLabel")}</Label>
                <Input
                  id="customer-country"
                  placeholder={t("customerSheet.countryPlaceholder")}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
            </div>
          </Section>

          <Section title={t("customerSheet.sectionAdvanced")} defaultOpen={false}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer-document-type">{t("customerSheet.documentTypeLabel")}</Label>
                <Select
                  value={documentType || undefined}
                  onValueChange={(value) => setDocumentType(value)}
                >
                  <SelectTrigger id="customer-document-type">
                    <SelectValue placeholder={t("customerSheet.documentTypePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {ALLOWED_DOCUMENT_TYPES.map((dt) => (
                      <SelectItem key={dt} value={dt}>{dt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer-document">{t("customerSheet.documentLabel")}</Label>
                <Input
                  id="customer-document"
                  placeholder={t("customerSheet.documentPlaceholder")}
                  value={document}
                  onChange={(e) => setDocument(e.target.value)}
                />
              </div>
            </div>
          </Section>

          {!isEdit && allowManualEnrollment && (
            <Section title="Acessos (matrícula manual)">
              <p className="text-sm text-muted-foreground">
                Conceda acesso a produtos e cursos sem o cliente passar por checkout.
              </p>
              <div className="space-y-2">
                <Label>Produtos</Label>
                <InlineCheckboxList
                  options={(catalog?.products ?? []).map((p) => ({ value: p.id, label: p.name }))}
                  value={enrollProducts}
                  onValueChange={setEnrollProducts}
                  emptyText="Nenhum produto cadastrado."
                />
              </div>
              <div className="space-y-2">
                <Label>Cursos</Label>
                <InlineCheckboxList
                  options={(catalog?.courses ?? []).map((c) => ({ value: c.id, label: c.title }))}
                  value={enrollCourses}
                  onValueChange={setEnrollCourses}
                  emptyText="Nenhum curso cadastrado."
                />
              </div>
            </Section>
          )}

          {isEdit && customer && allowManualEnrollment && (
            <CustomerAccessSection
              customerId={customer.id}
              userId={customer.user_id ?? null}
              email={customer.email}
            />
          )}

          {isEdit && customer && (
            <Section title="Suporte">
              <p className="text-sm text-muted-foreground">
                Envia um e-mail para o cliente redefinir a senha de acesso.
              </p>
              <Button
                type="button"
                variant="secondary"
                disabled={resettingPw}
                onClick={handleResetPassword}
              >
                {resettingPw ? "Enviando..." : "Enviar redefinição de senha"}
              </Button>
            </Section>
          )}
        </div>

        <SheetFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? t("common.save") : t("customerSheet.add")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
