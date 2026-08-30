import { SignupView } from "@/components/public/PublicAuth";
export default async function CrearCuenta({searchParams}:{searchParams:Promise<{error?:string}>}){const q=await searchParams;return <SignupView error={q.error} route="/crear-cuenta"/>}
