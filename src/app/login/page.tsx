import {LoginForm} from "@/components/login-form";
export default async function Login({searchParams}:{searchParams:Promise<{next?:string}>}){const params=await searchParams;return <LoginForm next={params.next?.startsWith("/")?params.next:"/dashboard"}/>}
