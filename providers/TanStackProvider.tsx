import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React, { useState } from "react"

export function TanStackProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () => new QueryClient({
            defaultOptions: {
                queries: {
                    staleTime: 1000 * 60 * 5,
                    gcTime: 1000 * 60 * 30,
                    refetchOnWindowFocus: false,
                    retry: 1,
                },
            },
        })
    )

    return (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
}