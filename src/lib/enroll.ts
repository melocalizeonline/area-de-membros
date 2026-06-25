import { invokeEdgeFunction } from "@/lib/edge-function-utils";

export interface EnrollArgs {
  tenantId: string;
  customerId?: string;
  email?: string;
  productIds?: string[];
  courseIds?: string[];
  action?: "grant" | "revoke";
}

/** Concede ou revoga acesso manual (sem checkout) a produtos/cursos. */
export async function enrollCustomer(args: EnrollArgs) {
  const { data } = await invokeEdgeFunction("enroll-customer", {
    body: {
      tenantId: args.tenantId,
      customerId: args.customerId,
      email: args.email,
      productIds: args.productIds ?? [],
      courseIds: args.courseIds ?? [],
      action: args.action ?? "grant",
    },
  });
  return data;
}
