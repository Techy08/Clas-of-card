import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import App from "./App";
import "./index.css";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "sonner";

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark">
      <App />
      <Toaster position="top-center" richColors />
    </ThemeProvider>
  </QueryClientProvider>
);
