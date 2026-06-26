import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fhirQueryDefaults } from "@/lib/query/config";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        ...fhirQueryDefaults,
        retry: false,
      },
    },
  });
}

export function TestQueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
