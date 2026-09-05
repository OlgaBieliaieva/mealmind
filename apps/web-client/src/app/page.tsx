import { redirect } from "next/navigation";

import { clientRoutes } from "@/features/client-shell/client-routes";

export default function Home() {
  redirect(clientRoutes.diary);
}
